"""
Test configuration and fixtures for backend tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.deps import get_db
from app.models import Account
from app.core.security import get_password_hash


@pytest.fixture(name="session")
def session_fixture():
    """Create a test database session"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Create a test client with overridden dependencies"""
    def get_session_override():
        return session
    
    app.dependency_overrides[get_db] = get_session_override
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture(name="test_admin")
def test_admin_fixture(session: Session):
    """Create a test admin user"""
    admin = Account(
        email="testadmin@example.com",
        name="Test Admin",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superuser=True,
        role="admin"
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


@pytest.fixture(name="test_streamer")
def test_streamer_fixture(session: Session):
    """Create a test streamer user"""
    streamer = Account(
        email="teststreamer@example.com",
        name="Test Streamer",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superuser=False,
        role="streamer"
    )
    session.add(streamer)
    session.commit()
    session.refresh(streamer)
    return streamer


@pytest.fixture(name="auth_headers_admin")
def auth_headers_admin_fixture(client: TestClient, test_admin: Account):
    """Get authentication headers for admin user"""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": test_admin.email, "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="auth_headers_streamer")
def auth_headers_streamer_fixture(client: TestClient, test_streamer: Account):
    """Get authentication headers for streamer user"""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": test_streamer.email, "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"} 