from dotenv import load_dotenv
from openai import OpenAI
import os
from pydantic import BaseModel

load_dotenv()

prompt = """
Analyse the correctness of the following student's answer to a question, and provide a brief summary addressed to them on what they did well and what they could improve on.

<question>
What's the sum of 1 and 1?
</question>

<answer>
3
</answer>
"""

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AnswerFeedback(BaseModel):
    correct: bool
    summary: str

response = client.responses.parse(
    model="gpt-5-mini",
    input=prompt,
    text_format=AnswerFeedback,
)

event = response.output_parsed
print("Correctness: ", event.correct)
print("Summary: ", event.summary)
