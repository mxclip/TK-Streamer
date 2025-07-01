from sqlmodel import Session, create_engine, select

from app.core.config import settings

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


def create_db_and_tables():
    from app.models import Account, Bag, Script, PhraseMap, MissingBag, Feedback
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session 