from flask_restx import Api, Namespace, Resource, fields
from flask import request, send_file, Response, stream_with_context
from .ai_utils import lecture_step
from .db import get_db
from .models import Lecture, Slide
import os
import mimetypes
from werkzeug.utils import secure_filename
from .ai_utils import (
    slide_to_speech,
    get_answer_feedback,
    user_ask_question,
    iter_tts_pcm_chunks,
)
import numpy as np
import soundfile as sf

api = Api(
    title="Deepest Learning API",
    version="1.0",
    description="Lecture instantiate / step / answer API",
    doc="/apidocs/",
)

ns = Namespace("lectures", description="Lecture operations")
api.add_namespace(ns, path="")

# models
upload_model = api.parser()
upload_model.add_argument(
    "file_obj", location="files", type="file", required=True, help="PDF file"
)

lecture_response = api.model(
    "LectureCreateResponse",
    {"id": fields.Integer("Lecture id"), "message": fields.String()},
)

step_response = api.model(
    "StepResponse",
    {
        "id": fields.Integer(),
        "slide": fields.Integer(),
        "text": fields.String(),
        "question": fields.String(),
        "hypothesis_use": fields.String(),
    },
)

answer_request = api.model("AnswerRequest", {"answer": fields.String(required=True)})
answer_response = api.model(
    "AnswerResponse",
    {
        "feedback": fields.String(),
        "correct": fields.String(),
        "hypothesis": fields.String(),
    },
)

question_request = api.model(
    "QuestionRequest", {"question": fields.String(required=True)}
)
question_response = api.model(
    "QuestionResponse",
    {"answer": fields.String(), "hypothesis": fields.String()},
)

UPLOAD_FOLDER = "uploads"  # Directory to store uploaded PDFs
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@ns.route("/instantiate-lecture")
class InstantiateLecture(Resource):
    @api.expect(upload_model)
    @api.response(201, "Created", lecture_response)
    def post(self):
        uploaded_file = request.files.get("file_obj")
        if not uploaded_file:
            api.abort(400, "file is required")

        # Save the uploaded file locally
        filename = secure_filename("uploaded.pdf")
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        uploaded_file.save(file_path)

        # Store the file path in the database
        db_gen = get_db()
        db = next(db_gen)
        try:
            lecture = Lecture(
                title=filename,
                pdf_path=file_path,
                lecture_hypothesis="We have no knowledge of the user's understanding",
            )
            db.add(lecture)
            db.commit()
            db.refresh(lecture)
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass

        return {"id": lecture.id, "message": "lecture instantiated"}, 201


@ns.route("/step/<int:lecture_id>/<int:slide_num>")
class StepResource(Resource):
    @api.response(200, "OK", step_response)
    def get(self, lecture_id, slide_num):
        db_gen = get_db()
        db = next(db_gen)
        try:
            lecture = db.query(Lecture).filter_by(id=lecture_id).first()
            if not lecture:
                api.abort(404, "lecture not found")

            result = lecture_step(lecture, slide_num)
            if (
                old_slide := db.query(Slide)
                .filter_by(lecture_id=lecture_id, slide_number=slide_num)
                .first()
            ):
                slide = Slide(
                    id=old_slide.id,
                    script=result["script"],
                    slide_number=slide_num,
                    lecture_id=lecture_id,
                    question=result["question"],
                )
            else:
                slide = Slide(
                    script=result["script"],
                    slide_number=slide_num,
                    lecture_id=lecture_id,
                    question=result["question"],
                )
            db.add(slide)
            db.add(lecture)
            db.commit()
            db.refresh(lecture)

            return {
                "id": slide.id,
                "slide": slide_num,
                "text": slide.script,
                "question": result["question"],
                "hypothesis_use": result["hypothesis_use"],
            }
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass


@ns.route("/answer/<int:lecture_id>/<int:slide_num>")
class AnswerResource(Resource):
    @api.expect(answer_request)
    @api.response(200, "OK", answer_response)
    def post(self, lecture_id, slide_num):
        payload = request.get_json() or {}
        answer = payload.get("answer")
        if not answer:
            api.abort(400, "answer required")
        db_gen = get_db()
        db = next(db_gen)
        lecture = db.query(Lecture).filter_by(id=lecture_id).first()
        if not lecture:
            api.abort(404, "lecture not found")

        slide = (
            db.query(Slide)
            .filter_by(lecture_id=lecture_id, slide_number=slide_num)
            .first()
        )
        if not slide:
            api.abort(404, "slide not found")

        result = get_answer_feedback(slide.question, answer, lecture.lecture_hypothesis)
        feedback = result["feedback"]
        correct = result["correct"]
        hypothesis = result["hypothesis"]

        lecture.lecture_hypothesis = hypothesis
        db.add(lecture)
        db.commit()
        db.refresh(lecture)
        return {
            "feedback": feedback,
            "correct": correct,
            "hypothesis": hypothesis,
        }


@ns.route("/audio/<int:lecture_id>/<int:slide_num>")
class AudioResource(Resource):
    def get(self, lecture_id, slide_num):
        db_gen = get_db()
        db = next(db_gen)
        try:
            slide = (
                db.query(Slide)
                .filter_by(lecture_id=lecture_id, slide_number=slide_num)
                .first()
            )
            if not slide:
                api.abort(404, "slide not found")

            # resolve relative path helper
            backend_root = os.path.dirname(os.path.dirname(__file__))

            def _resolve_path(path: str) -> str:
                return path if os.path.isabs(path) else os.path.join(backend_root, path)

            # optional streaming mode
            stream = request.args.get("stream", "0").lower() in {"1", "true", "yes"}

            if stream:
                # prepare output file path and persist reference
                output_dir = os.path.join(backend_root, "speech_outputs")
                os.makedirs(output_dir, exist_ok=True)
                output_path = os.path.join(
                    output_dir, f"{slide.slide_number}-{slide.lecture_id}.wav"
                )
                rel_path = os.path.relpath(output_path, backend_root)
                if slide.audio_path != rel_path:
                    slide.audio_path = rel_path
                    db.add(slide)
                    db.commit()
                    db.refresh(slide)

                # open a wav file writer so the final audio is also persisted
                sf_file = sf.SoundFile(
                    output_path,
                    mode="w",
                    samplerate=24000,
                    channels=1,
                    subtype="FLOAT",
                )

                def generate():
                    try:
                        for chunk in iter_tts_pcm_chunks(slide):
                            # write to disk incrementally
                            frames = np.frombuffer(chunk, dtype=np.float32)
                            if len(frames) > 0:
                                sf_file.write(frames)
                            # stream to client
                            yield chunk
                    finally:
                        try:
                            sf_file.close()
                        except Exception:
                            pass

                headers = {
                    "Content-Type": "application/octet-stream",
                    # custom format hint for clients using Web Audio API
                    "X-Audio-Format": "f32le; rate=24000; channels=1",
                    "Cache-Control": "no-store",
                }
                return Response(stream_with_context(generate()), headers=headers)

            resolved_path = None

            # if audio already exists and file is present, serve it
            if slide.audio_path:
                candidate_path = _resolve_path(slide.audio_path)
                if os.path.isfile(candidate_path):
                    resolved_path = candidate_path

            # otherwise, synthesize now and persist path
            if not resolved_path:
                audio_filename = slide_to_speech(slide)
                slide.audio_path = audio_filename
                db.add(slide)
                db.commit()
                db.refresh(slide)
                resolved_path = _resolve_path(audio_filename)

            if not os.path.isfile(resolved_path):
                api.abort(500, "audio generation failed")

            mime_type, _ = mimetypes.guess_type(resolved_path)
            return send_file(
                resolved_path,
                mimetype=mime_type or "application/octet-stream",
                as_attachment=False,
            )
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass


@ns.route("/user-question/<int:lecture_id>/<int:slide_num>")
class UserQuestionResource(Resource):
    @api.expect(answer_request)
    @api.response(200, "OK", answer_response)
    def post(self, lecture_id, slide_num):
        payload = request.get_json() or {}
        question = payload.get("question")
        if not question:
            api.abort(400, "question required")
        db_gen = get_db()
        db = next(db_gen)
        lecture = db.query(Lecture).filter_by(id=lecture_id).first()
        if not lecture:
            api.abort(404, "lecture not found")

        slide = (
            db.query(Slide)
            .filter_by(lecture_id=lecture_id, slide_number=slide_num)
            .first()
        )
        if not slide:
            api.abort(404, "slide not found")

        result = user_ask_question(slide.script, question, lecture.lecture_hypothesis)
        hypothesis = result["hypothesis"]
        lecture.lecture_hypothesis = hypothesis
        db.add(lecture)
        db.commit()
        db.refresh(lecture)
        return {
            "answer": result["answer"],
            "hypothesis": hypothesis,
        }
