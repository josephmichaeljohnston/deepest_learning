from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from typing import BinaryIO
import tempfile
import os
from tempfile import NamedTemporaryFile

from .models import Lecture

def load_slide(lecture, slide_number: int) -> BytesIO:
    """
    Extract a specific slide from a PDF stored in a SQLAlchemy binary column.

    Args:
        lecture: SQLAlchemy model instance with a binary column containing PDF data
        slide_number: The slide number to extract (1-indexed)

    Returns:
        BytesIO: File-like object containing the extracted slide as a PDF

    Raises:
        ValueError: If slide_number is invalid
        AttributeError: If lecture doesn't have the expected binary column
    """
    # Assuming the binary column is named 'pdf_data' - adjust as needed
    pdf_bytes = lecture.pdf_data

    if not pdf_bytes:
        raise ValueError("No PDF data found in lecture")

    # Create a file-like object from the binary data
    pdf_file = BytesIO(pdf_bytes)

    # Read the PDF
    reader = PdfReader(pdf_file)

    # Validate slide number (convert to 0-indexed)
    total_pages = len(reader.pages)
    if slide_number < 1 or slide_number > total_pages:
        raise ValueError(f"Slide number {slide_number} out of range (1-{total_pages})")

    # Create a new PDF with just the requested slide
    writer = PdfWriter()
    writer.add_page(reader.pages[slide_number - 1])

    # Write to a BytesIO object
    output = BytesIO()
    writer.write(output)
    output.seek(0)  # Reset pointer to beginning

    return output


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

    with open(lecture.pdf_path, "rb") as pdf_file:
        reader = PdfReader(pdf_file)
        
        total_pages = len(reader.pages)
        if slide_num < 1 or slide_num > total_pages:
            raise ValueError(f"Slide number {slide_num} out of range (1-{total_pages})")

        writer = PdfWriter()
        writer.add_page(reader.pages[slide_num - 1])

    temp_file = NamedTemporaryFile(delete=False, suffix=".pdf")
    writer.write(temp_file)
    temp_file.flush()
    temp_file.close()
    return temp_file
