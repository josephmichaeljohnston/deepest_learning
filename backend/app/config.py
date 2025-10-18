import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
    DB_USER = os.environ.get("DATABASE_USER", "root")
    DB_PASS = os.environ.get("DATABASE_PASSWORD", "")
    DB_HOST = os.environ.get("DATABASE_HOST", "127.0.0.1")
    DB_PORT = os.environ.get("DATABASE_PORT", "3306")
    DB_NAME = os.environ.get("DATABASE_NAME", "deepest_learning")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    # we won't use flask-sqlalchemy extension; use SQLAlchemy directly
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "./uploads")
