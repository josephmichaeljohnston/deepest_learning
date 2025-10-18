from openai import OpenAI
import os
from tempfile import NamedTemporaryFile

from .models import Lecture, Slide
from .prompts import lecture_intro_prompt, lecture_step_prompt
from .utils import load_slide_as_named_tempfile

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def load_slide_as_named_tempfile(lecture: Lecture, slide_num: int):
    """
    Load a slide from the locally stored PDF file as a temporary file.

    Args:
        lecture: The lecture containing the PDF file path.
        slide_num: The slide number to load.

    Returns:
        A NamedTemporaryFile object containing the slide data.
    """
    if not lecture.pdf_path:
        raise ValueError("Lecture does not have a valid PDF path.")

    # For simplicity, assume the entire PDF is loaded (update logic if slides are split)
    with open(lecture.pdf_path, "rb") as pdf_file:
        temp_file = NamedTemporaryFile(delete=False, suffix=".pdf")
        temp_file.write(pdf_file.read())
        temp_file.close()
        return temp_file


def lecture_step(lecture: Lecture, slide_num: int):
    """
    Generate a step in a lecture and inplace update the lecture with the generated script.

    Args:
        lecture: The lecture to generate a step for.
        slide_num: The slide number to generate a step for.
    """

    uploaded_slide = client.files.create(
        file=load_slide_as_named_tempfile(lecture, slide_num), purpose="assistants"
    )

    try:
        response = client.responses.create(
            model="gpt-5-mini",
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                lecture_intro_prompt("", "")
                                if slide_num == 1
                                else lecture_step_prompt(lecture.script, "", "")
                            ),  # TODO: add student and lecture hypotheses
                        },
                        {
                            "type": "input_file",
                            "file_id": uploaded_slide.id,
                        },
                    ],
                },
            ],
        )

        return response.output_text

    finally:
        if uploaded_slide is not None:
            client.files.delete(uploaded_slide.id)
