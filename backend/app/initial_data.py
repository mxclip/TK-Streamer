import logging

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine, create_db_and_tables
from app.core.security import get_password_hash
from app.models import Account, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(session: Session) -> None:
    """
    Initialize database with initial data.
    """
    # Create tables
    create_db_and_tables()
    
    # Check if first superuser exists
    statement = select(Account).where(Account.email == settings.FIRST_SUPERUSER)
    user = session.exec(statement).first()
    
    if not user:
        # Create first superuser
        user_in = Account(
            email=settings.FIRST_SUPERUSER,
            name="Admin User",
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            role=UserRole.admin,
            is_superuser=True,
            is_active=True,
        )
        session.add(user_in)
        session.commit()
        session.refresh(user_in)
        logger.info("First superuser created successfully")
    else:
        logger.info("First superuser already exists")


def main() -> None:
    logger.info("Creating initial data")
    with Session(engine) as session:
        init_db(session)
    logger.info("Initial data created")


if __name__ == "__main__":
    main() 