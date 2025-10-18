def process_step(lecture_id: int, slide_num: int, slide_text: str) -> str:
    """User-implemented: perform processing for a step and return text.

    For now return a placeholder string.
    """
    # TODO: replace with real implementation
    return f"Processed lecture {lecture_id} slide {slide_num}: { (slide_text or '')[:200] }"


def answer_question(lecture_id: int, slide_num: int, question: str) -> str:
    """User-implemented: answer a question for a slide.

    For now return a placeholder answer.
    """
    # TODO: replace with real implementation
    return f"Answer for lecture {lecture_id} slide {slide_num}: I don't know yet. Got question: {question[:200]}"
