from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def lecture_intro() -> str:
    slide_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "Slide2.pdf"))

    uploaded_slide = None
    with open(slide_path, "rb") as slide_file:
        uploaded_slide = client.files.create(file=slide_file, purpose="assistants")

    try:
        response = client.responses.create(
            model="gpt-5-mini",
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": prompt,
                        },
                        {
                            "type": "input_file",
                            "file_id": uploaded_slide.id,
                        },
                    ],
                },
            ],
        )

        print(response.output_text)
    finally:
        if uploaded_slide is not None:
            client.files.delete(uploaded_slide.id)
