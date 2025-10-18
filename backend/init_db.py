import os
from app.config import Config
from sqlalchemy import create_engine


def main():
    uri = Config.SQLALCHEMY_DATABASE_URI
    engine = create_engine(uri)
    print("Connecting to:", uri)
    # This will create tables via SQLAlchemy metadata when importing models
    from app.db import Base

    Base.metadata.create_all(bind=engine)
    print("DB initialized")


if __name__ == "__main__":
    main()
