import os
from flask import Blueprint, request, current_app, jsonify, send_file
from werkzeug.utils import secure_filename
from io import BytesIO
from .db import get_db
from .models import Lecture, Slide

bp = Blueprint("main", __name__)


def allowed_file(filename):
    return "." in filename and filename.lower().endswith(".pdf")


@bp.route("/instantiate-lecture", methods=["POST"])
def instantiate_lecture():
    # accepts a PDF file and text
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400
    file = request.files["file"]
    text = (
        request.form.get("text")
        or request.form.get("title")
        or request.form.get("description")
    )

    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "a PDF file is required"}), 400

    filename = secure_filename(file.filename)
    data = file.read()

    # save to DB
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

    return jsonify({"id": lecture.id, "message": "lecture instantiated"}), 201


@bp.route("/step/<int:lecture_id>/<int:slide_num>", methods=["GET"])
def step(lecture_id: int, slide_num: int):
    # load slide or create placeholder
    db_gen = get_db()
    db = next(db_gen)
    try:
        slide = (
            db.query(Slide)
            .filter_by(lecture_id=lecture_id, slide_number=slide_num)
            .first()
        )
        if not slide:
            return jsonify({"error": "slide not found"}), 404
        # call user function process_step(lecture_id, slide_num, slide_text)
        # user will implement process_step in app/handlers.py
        try:
            from .handlers import process_step
        except Exception:
            return jsonify({"error": "process_step not implemented"}), 501

        result_text = process_step(lecture_id, slide_num, slide.text)
        return jsonify({"id": lecture_id, "slide": slide_num, "text": result_text})
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


@bp.route("/answer/<int:lecture_id>/<int:slide_num>", methods=["POST"])
def answer(lecture_id: int, slide_num: int):
    data = request.get_json() or {}
    question = data.get("question") or data.get("text")
    if not question:
        return jsonify({"error": "question/text required in JSON body"}), 400

    # call user function answer_question(lecture_id, slide_num, question)
    try:
        from .handlers import answer_question
    except Exception:
        return jsonify({"error": "answer_question not implemented"}), 501

    ans = answer_question(lecture_id, slide_num, question)
    return jsonify({"id": lecture_id, "slide": slide_num, "answer": ans})


@bp.route("/working", methods=["GET"])
def working():
    return "working", 200
