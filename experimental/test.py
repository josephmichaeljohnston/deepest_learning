from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

prompt = """
You're a university lecturer whose given a lecture this point:
<lecture>
Hi everyone, welcome to our first lecture on sensor networks and mobile data communications. Today we'll be covering wireless sensor networks.
</lecture>

We're also keeping track of some extra information, to help you tailor you're lecture style. Do not mention any of this content in your response.

*Context about the average student you're teaching*
<student context>
The student is a 1st year undergraduate level.
</student context>

*What the students understand about this topic*
<understanding context>
They understand the application and network layer very well, but have no understanding at all about the physical layer.
</understanding context>

Attached is the next slide of your pdf presentation. Please continue your lecture from the exact point you left off to cover the content in this slide. Make sure your keep your lecture conversational and engaging (avoid bullet points and lists where possible).
"""

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
