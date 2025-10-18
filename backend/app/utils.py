from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from typing import BinaryIO
import tempfile
import os


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


def load_slide_as_named_tempfile(lecture, slide_number: int):
    """
    Extract slide and return as NamedTemporaryFile.
    File will be auto-deleted when closed or garbage collected.

    Returns a real file object identical to open(), but temporary.
    """
    output_bytes = load_slide(lecture, slide_number)

    # delete=True means file is removed when closed
    temp_file = tempfile.NamedTemporaryFile(mode="w+b", suffix=".pdf", delete=True)
    temp_file.write(output_bytes.read())
    temp_file.seek(0)  # Reset to beginning for reading

    return temp_file
