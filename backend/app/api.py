from flask_restx import Api, Namespace, Resource, fields
from flask import request, send_file
from .ai_utils import lecture_step
from .db import get_db
from .models import Lecture, Slide
from .handlers import process_step, answer_question
import os
import mimetypes
from werkzeug.utils import secure_filename
from .ai_utils import slide_to_speech

api = Api(
    title="Deepest Learning API",
    version="1.0",
    description="Lecture instantiate / step / answer API",
    doc="/apidocs/",
)

ns = Namespace("lectures", description="Lecture operations")
api.add_namespace(ns, path="/lectures")

# Health check endpoint (not in namespace)
@api.route('/health')
class Health(Resource):
    def get(self):
        """Health check endpoint to verify backend is running"""
        return {"status": "ok", "message": "Backend is running"}, 200

# models
upload_model = api.parser()
upload_model.add_argument(
    "file_obj", location="files", type="file", required=True, help="PDF file"
)

lecture_response = api.model(
    "LectureCreateResponse",
    {
        "id": fields.Integer("Lecture id"),
        "message": fields.String(),
    },
)

step_response = api.model(
    "StepResponse",
    {"id": fields.Integer(), "slide": fields.Integer(), "text": fields.String()},
)

answer_request = api.model("AnswerRequest", {"question": fields.String(required=True)})
answer_response = api.model(
    "AnswerResponse",
    {"id": fields.Integer(), "slide": fields.Integer(), "answer": fields.String()},
)

verify_response = api.model(
    "VerifyResponse",
    {
        "exists": fields.Boolean("Whether lecture exists"),
        "hash_match": fields.Boolean("Whether hash matches"),
        "message": fields.String(),
    },
)

UPLOAD_FOLDER = "uploads"  # Directory to store uploaded PDFs
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@ns.route("/instantiate-lecture")
class InstantiateLecture(Resource):
    @api.expect(upload_model)
    @api.response(201, "Created", lecture_response)
    def post(self):
        try:
            uploaded_file = request.files.get("file_obj")
            if not uploaded_file:
                api.abort(400, "file is required")

            # Save the uploaded file locally (always same filename - single file system)
            filename = secure_filename("uploaded.pdf")
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            uploaded_file.save(file_path)
            print(f"[InstantiateLecture] PDF saved to {file_path}")

            # Single-file system: always use lecture ID 1
            db_gen = get_db()
            db = next(db_gen)
            lecture_id = None
            try:
                # Check if lecture with ID 1 already exists
                lecture = db.query(Lecture).filter_by(id=1).first()
                if lecture:
                    # Delete old slides to start fresh
                    print(f"[InstantiateLecture] Replacing existing lecture, deleting old slides")
                    db.query(Slide).filter_by(lecture_id=1).delete()
                    db.commit()
                    # Update existing lecture
                    lecture.title = filename
                    lecture.pdf_path = file_path
                    db.add(lecture)
                else:
                    # Create new lecture with ID 1
                    lecture = Lecture(id=1, title=filename, pdf_path=file_path)
                    db.add(lecture)
                
                db.commit()
                db.refresh(lecture)
                lecture_id = lecture.id
                print(f"[InstantiateLecture] Lecture {lecture_id} ready")
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass

            if lecture_id is None:
                api.abort(500, "Failed to create lecture")

            return {"id": lecture_id, "message": "lecture instantiated"}, 201
        except Exception as e:
            print(f"[InstantiateLecture] Error: {str(e)}")
            import traceback
            traceback.print_exc()
            api.abort(500, f"Error creating lecture: {str(e)}")


@ns.route("/step/<int:lecture_id>/<int:slide_num>")
class StepResource(Resource):
    @api.response(200, "OK", step_response)
    def get(self, lecture_id, slide_num):
        db_gen = get_db()
        db = next(db_gen)
        try:
            lecture = db.query(Lecture).filter_by(id=lecture_id).first()
            if not lecture:
                print(f"ERROR: Lecture {lecture_id} not found. Available lectures: {[l.id for l in db.query(Lecture).all()]}")
                api.abort(404, f"lecture {lecture_id} not found")
            
            print(f"[StepResource] Processing lecture_id={lecture_id}, slide_num={slide_num}, pdf_path={lecture.pdf_path}")
            
            if not lecture.pdf_path or not os.path.isfile(lecture.pdf_path):
                print(f"ERROR: PDF file not found at {lecture.pdf_path}")
                api.abort(404, f"PDF file not found for lecture {lecture_id}")

            slide_text = lecture_step(lecture, slide_num)
            slide = Slide(
                script=slide_text, slide_number=slide_num, lecture_id=lecture_id
            )
            db.add(slide)
            db.add(lecture)
            db.commit()
            db.refresh(lecture)

            print(f"[StepResource] Generating audio for slide...")
            audio_filename = slide_to_speech(slide)
            print(f"[StepResource] Audio generated: {audio_filename}")
            slide.audio_path = audio_filename
            db.add(slide)
            db.commit()
            db.refresh(slide)
            print(f"[StepResource] Slide {slide_num} complete. audio_path saved: {slide.audio_path}")

            return {
                "id": lecture_id,
                "slide": slide_num,
                "text": slide.script,
            }
        except Exception as e:
            print(f"ERROR in StepResource: {str(e)}")
            import traceback
            traceback.print_exc()
            api.abort(500, f"Error processing step: {str(e)}")
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
        question = payload.get("question")
        if not question:
            api.abort(400, "question required")
        return {
            "id": lecture_id,
            "slide": slide_num,
            "answer": answer_question(lecture_id, slide_num, question),
        }


@ns.route("/audio-status/<int:lecture_id>/<int:slide_num>")
class AudioStatusResource(Resource):
    @api.response(200, "OK", api.model(
        "AudioStatus",
        {"status": fields.String(), "ready": fields.Boolean()}
    ))
    def get(self, lecture_id, slide_num):
        """Check if audio is ready for a slide"""
        db_gen = get_db()
        db = next(db_gen)
        try:
            print(f"[AudioStatusResource] Checking audio status for lecture_id={lecture_id}, slide_num={slide_num}")
            slide = (
                db.query(Slide)
                .filter_by(lecture_id=lecture_id, slide_number=slide_num)
                .first()
            )
            if not slide:
                print(f"[AudioStatusResource] Slide not found")
                return {"status": "not_found", "ready": False}, 200

            audio_path = slide.audio_path
            print(f"[AudioStatusResource] Slide found. audio_path={audio_path}")
            if not audio_path:
                # Still generating - audio_path not set yet
                print(f"[AudioStatusResource] audio_path is empty, still generating")
                return {"status": "generating", "ready": False}, 200

            # Check if file actually exists on disk
            if os.path.isabs(audio_path):
                resolved_path = audio_path
            else:
                backend_root = os.path.dirname(os.path.dirname(__file__))
                resolved_path = os.path.join(backend_root, audio_path)

            print(f"[AudioStatusResource] Checking if file exists: {resolved_path}")
            if os.path.isfile(resolved_path):
                print(f"[AudioStatusResource] Audio file ready!")
                return {"status": "ready", "ready": True}, 200
            else:
                # File path recorded but not yet written
                print(f"[AudioStatusResource] File not found yet, still generating")
                return {"status": "generating", "ready": False}, 200
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass


@ns.route("/audio/<int:lecture_id>/<int:slide_num>")
class AudioResource(Resource):
    def get(self, lecture_id, slide_num):
        db_gen = get_db()
        db = next(db_gen)
        try:
            print(f"[AudioResource] Fetching audio for lecture_id={lecture_id}, slide_num={slide_num}")
            slide = (
                db.query(Slide)
                .filter_by(lecture_id=lecture_id, slide_number=slide_num)
                .first()
            )
            if not slide:
                print(f"[AudioResource] ERROR: Slide not found in database for lecture_id={lecture_id}, slide_num={slide_num}")
                print(f"[AudioResource] Available slides: {[(s.lecture_id, s.slide_number, s.audio_path) for s in db.query(Slide).all()]}")
                api.abort(404, "slide not found")

            audio_path = slide.audio_path
            print(f"[AudioResource] Slide found. audio_path={audio_path}")
            
            if not audio_path:
                print(f"[AudioResource] ERROR: audio_path is NULL/empty for slide")
                api.abort(404, "audio not available for this slide")

            # resolve relative paths against backend root
            if os.path.isabs(audio_path):
                resolved_path = audio_path
            else:
                backend_root = os.path.dirname(os.path.dirname(__file__))
                resolved_path = os.path.join(backend_root, audio_path)

            print(f"[AudioResource] Resolved audio path: {resolved_path}")
            
            if not os.path.isfile(resolved_path):
                print(f"[AudioResource] ERROR: Audio file does not exist at {resolved_path}")
                api.abort(404, "audio file not found")

            print(f"[AudioResource] Serving audio file: {resolved_path}")
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
