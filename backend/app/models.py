from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base


# class Student(Base):
#     __tablename__ = "students"
#     id = Column(Integer, primary_key=True)
#     student_hypothesis = Column(Text, nullable=True)
#     lectures = relationship(
#         "Lecture", back_populates="student", cascade="all, delete-orphan"
#     )


class Lecture(Base):
    __tablename__ = "lectures"
    id = Column(Integer, primary_key=True)
    # student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    title = Column(String(255), nullable=True)
    pdf_filename = Column(String(512), nullable=True)
    pdf_path = Column(String(512), nullable=True)  # Path to the locally stored PDF file
    script = Column(Text, nullable=True)
    lecture_hypothesis = Column(Text, nullable=True)

    slides = relationship(
        "Slide", back_populates="lecture", cascade="all, delete-orphan"
    )


class Slide(Base):
    __tablename__ = "slides"
    id = Column(Integer, primary_key=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    slide_number = Column(Integer, nullable=False)
    script = Column(Text, nullable=True)
    audio_path = Column(String(512), nullable=True)

    lecture = relationship("Lecture", back_populates="slides")
