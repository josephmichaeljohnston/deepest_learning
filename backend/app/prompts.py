def lecture_intro_prompt(student_hypothesis: str, lecture_hypothesis: str) -> str:
    """
    Generate a prompt for a university lecturer to give an introduction to a lecture.

    Args:
        student_hypothesis: The general hypothesis of the student (aggregated over multiple lectures)
        lecture_hypothesis: The specific hypothesis of student's understanding of this lectures content.

    Returns:
        A prompt for a university lecturer to give an introduction to a lecture.
    """
    return (
f"""
You're a university lecturer whose giving a lecture to a student with this being the introductory slide.

We're also keeping track of some extra information, to help you tailor you're lecture style. Do not mention any of this context in your response.

*Context about the student you're teaching*
<student context>
{student_hypothesis}
</student context>

*What the student understands about this topic*
<understanding context>
{lecture_hypothesis}
</understanding context>

Attached is the first slide of your pdf presentation. Write a brief friendly introduction to the lecture. Make sure your keep your lecture conversational and engaging (avoid bullet points and lists where possible). Do not end your lecturing over this slide with a question or summary line.
"""
    )


def lecture_step_prompt(lecture: str, student_hypothesis: str, lecture_hypothesis: str) -> str:
    """
    Generate a prompt for a university lecturer to continue a lecture for the next slide.

    Args:
        lecture: The lecture so far.
        student_hypothesis: The general hypothesis of the student (aggregated over multiple lectures)
        lecture_hypothesis: The specific hypothesis of student's understanding of this lectures content.

    Returns:
        A prompt for a university lecturer to continue a lecture for the next slide.
    """
    return (
f"""
You're a university lecturer whose given a lecture this point:
<lecture>
{lecture}
</lecture>

We're also keeping track of some extra information, to help you tailor you're lecture style. Do not mention any of this context in your response.

*Context about the student you're teaching*
<student context>
{student_hypothesis}
</student context>

*What the student understands about this topic*
<understanding context>
{lecture_hypothesis}
</understanding context>

Attached is the next slide of your pdf presentation. Please continue your lecture from the exact point you left off to cover the content in this slide. Make sure your keep your lecture conversational and engaging (avoid bullet points and lists where possible). Do not end your lecturing over this slide with a question or summary line.
"""
    )


def question_prompt(lecture: str, student_hypothesis: str, lecture_hypothesis: str) -> str:
    """
    Generate a prompt for a university lecturer to ask a question about the content of a lecture.

    Args:
        lecture: The lecture so far.
        student_hypothesis: The general hypothesis of the student (aggregated over multiple lectures)
        lecture_hypothesis: The specific hypothesis of student's understanding of this lectures content.

    Returns:
        A prompt for a university lecturer to ask a question about the content of a lecture.
    """
    return (
f"""
Below, we have a lecture that is being delivered to a student and a hypothesis of what we believe we know about the student.

<lecture>
{lecture}
</lecture>

<student hypothesis>
{student_hypothesis}
</student hypothesis>

<understanding hypothesis>
{lecture_hypothesis}
</understanding hypothesis>

Ask the student a question about the content discussed in the later parts of the lecture that will help provide insight into their level of understanding. Make the question have a short written response. Only ask the question, nothing else.
"""
    )


def answer_feedback_prompt(question: str, answer: str) -> str:
    """
    Generate a prompt for a university lecturer to provide feedback on a student's answer to a question.
    NOTE: This prompt expects the use of structured outputs.

    Args:
        question: The question that was asked.
        answer: The student's answer to the question.

    Returns:
        A prompt for a university lecturer to provide feedback on a student's answer to a question.
    """
    return (
f"""
Analyse the correctness of the following student's answer to a question, and provide a brief summary addressed to them on what they did well and what they could improve on.

<question>
{question}
</question>

<answer>
{answer}
</answer>
"""
    )
