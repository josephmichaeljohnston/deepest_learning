from flask_restx import Api, Namespace, Resource, fields
from flask import request
from .ai_utils import lecture_step
from .db import get_db
from .models import Lecture, Slide
from .handlers import process_step, answer_question

api = Api(
    title="Deepest Learning API",
    version="1.0",
    description="Lecture instantiate / step / answer API",
    doc="/apidocs/",
)

ns = Namespace("lectures", description="Lecture operations")
api.add_namespace(ns, path="/")

# models
upload_model = api.parser()
upload_model.add_argument(
    "file", location="files", type="file", required=True, help="PDF file"
)
upload_model.add_argument(
    "text", location="form", type=str, required=False, help="Associated text"
)

lecture_response = api.model(
    "LectureCreateResponse",
    {"id": fields.Integer("Lecture id"), "message": fields.String()},
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


@ns.route("/instantiate-lecture")
class InstantiateLecture(Resource):
    @api.expect(upload_model)
    @api.response(201, "Created", lecture_response)
    def post(self):
        args = upload_model.parse_args()
        uploaded = args.get("file")
        text = args.get("text")
        if not uploaded:
            api.abort(400, "file is required")
        file = uploaded
        filename = getattr(file, "filename", "uploaded.pdf")
        data = file.read()

        db_gen = get_db()
        db = next(db_gen)
        try:
            lecture = Lecture(
                title=filename, pdf_filename=filename, pdf_data=data, text=text
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
            slide = (
                db.query(Slide)
                .filter_by(lecture_id=lecture_id, slide_number=slide_num)
                .first()
            )
            if not slide:
                api.abort(404, "slide not found")

            lecture = db.query(Lecture).filter_by(id=lecture_id).first()
            if not lecture:
                api.abort(404, "lecture not found")

            slide_text = lecture_step(lecture, slide_num)
            slide = Slide(text=slide_text, slide_number=slide_num, lecture_id=lecture_id)
            db.add(slide)
            db.add(lecture)
            db.commit()
            db.refresh(lecture)

            return {
                "id": lecture_id,
                "slide": slide_num,
                "text": process_step(lecture_id, slide_num, slide.text),
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
        question = payload.get("question")
        if not question:
            api.abort(400, "question required")
        return {
            "id": lecture_id,
            "slide": slide_num,
            "answer": answer_question(lecture_id, slide_num, question),
        }
