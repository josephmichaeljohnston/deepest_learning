from openai import OpenAI
import os
from kokoro import KPipeline
import soundfile as sf

from .models import Lecture, Slide
from .prompts import lecture_intro_prompt, lecture_step_prompt
from .utils import load_slide_as_named_tempfile

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pipeline = KPipeline(lang_code='a')


def lecture_step(lecture: Lecture, slide_num: int):
    """
    Generate a step in a lecture and inplace update the lecture with the generated script.

    Args:
        lecture: The lecture to generate a step for.
        slide_num: The slide number to generate a step for.
    """
    temp = load_slide_as_named_tempfile(lecture, slide_num)
    uploaded_slide = None

    try:
        with open(temp.name, "rb") as f:
            uploaded_slide = client.files.create(file=f, purpose="assistants")

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
        try:
            # remove the temporary file created for upload
            if temp and os.path.exists(temp.name):
                os.unlink(temp.name)
        except Exception:
            pass


def slide_to_speech(slide: Slide):
    """
    Generate a speech for a slide.

    Args:
        slide: The slide to generate a speech for.

    Returns:
        The path to the generated speech file.
    """
    generator = pipeline(slide.script, voice="af_heart")
    for i, (gs, ps, audio) in enumerate(generator):
        print(i, gs, ps)
        sf.write(f"speech_outputs/{slide.id}.wav", audio, 24000)
    return f"speech_outputs/{slide.id}.wav"
