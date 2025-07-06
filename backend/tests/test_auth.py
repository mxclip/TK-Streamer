"""
Test authentication endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Account


def test_login_success(client: TestClient, test_admin: Account):
    """Test successful login"""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": test_admin.email, "password": "testpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == test_admin.email


def test_login_invalid_credentials(client: TestClient, test_admin: Account):
    """Test login with invalid credentials"""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": test_admin.email, "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    """Test login with non-existent user"""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "nonexistent@example.com", "password": "password"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_get_current_user(client: TestClient, auth_headers_admin: dict):
    """Test getting current user info"""
    response = client.get("/api/v1/auth/me", headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testadmin@example.com"
    assert data["role"] == "admin"


def test_get_current_user_unauthorized(client: TestClient):
    """Test getting current user without auth"""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated" 