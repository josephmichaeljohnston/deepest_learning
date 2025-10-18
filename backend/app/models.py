from sqlalchemy import Column, Integer, String, LargeBinary, Text, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base


class Lecture(Base):
    __tablename__ = "lectures"
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=True)
    pdf_filename = Column(String(512), nullable=True)
    pdf_data = Column(LargeBinary, nullable=True)
    text = Column(Text, nullable=True)

    slides = relationship(
        "Slide", back_populates="lecture", cascade="all, delete-orphan"
    )


class Slide(Base):
    __tablename__ = "slides"
    id = Column(Integer, primary_key=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"), nullable=False)
    slide_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=True)

    lecture = relationship("Lecture", back_populates="slides")
