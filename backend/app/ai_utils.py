from openai import OpenAI
import os
from kokoro import KPipeline
import soundfile as sf
import re
import numpy as np

from .models import Lecture, Slide
from .prompts import lecture_intro_prompt, lecture_step_prompt
from .utils import load_slide_as_named_tempfile

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pipeline = KPipeline(lang_code='a')


def _split_into_sentences(text: str):
    """
    Split text into sentences using simple punctuation rules.

    Args:
        text: The input text to split.

    Returns:
        A list of sentence strings.
    """
    # basic split on punctuation boundaries to avoid overloading tts with very long inputs
    text = text.strip()
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


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
    # ensure output directory exists
    backend_root = os.path.dirname(os.path.dirname(__file__))
    output_dir = os.path.join(backend_root, "speech_outputs")
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, f"{slide.slide_number}-{slide.lecture_id}.wav")

    # split script into sentences and synthesize one by one
    sentences = _split_into_sentences(slide.script or "")
    audio_chunks = []

    for sentence in sentences:
        generator = pipeline(sentence, voice="af_heart")
        for i, (gs, ps, audio) in enumerate(generator):
            print(i, gs, ps)
            # ensure consistent dtype for concatenation
            audio_chunks.append(np.asarray(audio, dtype=np.float32))

    if audio_chunks:
        full_audio = np.concatenate(audio_chunks)
    else:
        # fallback to tiny silence if nothing synthesized
        full_audio = np.zeros(0, dtype=np.float32)

    sf.write(output_path, full_audio, 24000)

    # return relative path for storage in database
    return os.path.relpath(output_path, backend_root)
