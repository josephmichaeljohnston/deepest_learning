from flask_restx import Api, Namespace, Resource, fields
from flask import request, send_file
from .ai_utils import lecture_step
from .db import get_db
from .models import Lecture, Slide
import os
import mimetypes
from werkzeug.utils import secure_filename
from .ai_utils import slide_to_speech, get_answer_feedback, user_ask_question

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

            audio_filename = slide_to_speech(slide)
            slide.audio_path = audio_filename
            db.add(slide)
            db.commit()
            db.refresh(slide)

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

            audio_path = slide.audio_path
            if not audio_path:
                api.abort(404, "audio not available for this slide")

            # resolve relative paths against backend root
            if os.path.isabs(audio_path):
                resolved_path = audio_path
            else:
                backend_root = os.path.dirname(os.path.dirname(__file__))
                resolved_path = os.path.join(backend_root, audio_path)

            if not os.path.isfile(resolved_path):
                api.abort(404, "audio file not found")

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


import io
import numpy as np
import soundfile as sf
from flask import Response
import re


def _split_into_sentences_for_streaming(text: str):
    """Split text into sentences for streaming."""
    text = text.strip()
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def generate_audio_stream(script: str, voice: str = "af_heart"):
    """
    Generator that yields WAV audio chunks as they're synthesized.

    Args:
        script: The text to synthesize
        voice: The voice to use for synthesis

    Yields:
        Audio data chunks in WAV format
    """
    from .ai_utils import pipeline

    sentences = _split_into_sentences_for_streaming(script)

    # WAV header will be written first, then we append audio data
    # We'll use a streaming approach where we yield chunks
    is_first_chunk = True
    sample_rate = 24000

    for sentence in sentences:
        generator = pipeline(sentence, voice=voice)

        for i, (gs, ps, audio) in enumerate(generator):
            audio_array = np.asarray(audio, dtype=np.float32)

            # Convert numpy array to WAV bytes
            buffer = io.BytesIO()
            sf.write(buffer, audio_array, sample_rate, format="WAV")
            buffer.seek(0)
            wav_bytes = buffer.read()

            if is_first_chunk:
                # First chunk includes the WAV header
                yield wav_bytes
                is_first_chunk = False
            else:
                # Subsequent chunks: skip the 44-byte WAV header
                yield wav_bytes[44:]


@ns.route("/audio-stream/<int:lecture_id>/<int:slide_num>")
class AudioStreamResource(Resource):
    def get(self, lecture_id, slide_num):
        """Stream audio as it's being generated in real-time"""
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

            if not slide.script:
                api.abort(404, "no script available for this slide")

            return Response(
                generate_audio_stream(slide.script),
                mimetype="audio/wav",
                headers={
                    "Content-Disposition": "inline",
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                    "Transfer-Encoding": "chunked",
                },
            )
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass
