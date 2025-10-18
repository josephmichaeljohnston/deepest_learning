import os
import time
from sqlalchemy import create_engine as sa_create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError

# remove any eager engine creation at import time and make init lazy

engine = None
SessionLocal = None
Base = declarative_base()


def _create_engine_with_retry(database_url, max_retries=12, initial_delay=3):
    delay = initial_delay
    for attempt in range(1, max_retries + 1):
        try:
            eng = sa_create_engine(database_url, pool_pre_ping=True)
            # quick connection test
            with eng.connect():
                pass
            return eng
        except OperationalError:
            if attempt == max_retries:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 30)


def init_db(app=None):
    """
    Initialize the engine and SessionLocal. Call this from run/startup (or it will
    be called lazily from get_db).
    """
    global engine, SessionLocal, Base

    # Determine URI: prefer app.config then environment variables
    uri = None
    if app is not None:
        uri = app.config.get("SQLALCHEMY_DATABASE_URI")

    if not uri:
        DB_USER = os.getenv("DATABASE_USER", "root")
        DB_PASS = os.getenv("DATABASE_PASSWORD", "example")
        DB_HOST = os.getenv("DATABASE_HOST", "db")
        DB_PORT = os.getenv("DATABASE_PORT", "3306")
        DB_NAME = os.getenv("DATABASE_NAME", "deepest_learning")
        uri = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    engine = _create_engine_with_retry(uri)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    # create tables if they don't exist
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db():
    """Yield a DB session. Caller should close session."""
    global SessionLocal
    if SessionLocal is None:
        # lazy init if not initialized yet
        init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
