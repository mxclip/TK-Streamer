"""
Test bags endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Account, Bag


def test_create_bag(client: TestClient, auth_headers_admin: dict):
    """Test creating a new bag"""
    bag_data = {
        "name": "Birkin 35",
        "brand": "Hermès",
        "color": "Black",
        "condition": "excellent",
        "details": "Togo leather with gold hardware",
        "price": 35000.00,
        "authenticity_verified": True
    }
    
    response = client.post(
        "/api/v1/bags",
        json=bag_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["brand"] == bag_data["brand"]
    assert data["model"] == bag_data["name"]  # name maps to model
    assert data["price"] == bag_data["price"]


def test_get_bags(client: TestClient, session: Session, test_admin: Account, auth_headers_admin: dict):
    """Test getting list of bags"""
    # Create test bags
    bags = [
        Bag(
            brand="Chanel",
            model="Classic Flap",
            color="Black",
            condition="good",
            account_id=test_admin.id
        ),
        Bag(
            brand="Louis Vuitton",
            model="Speedy 30",
            color="Monogram",
            condition="fair",
            account_id=test_admin.id
        )
    ]
    
    for bag in bags:
        session.add(bag)
    session.commit()
    
    response = client.get("/api/v1/bags", headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert any(bag["brand"] == "Chanel" for bag in data)
    assert any(bag["brand"] == "Louis Vuitton" for bag in data)


def test_import_bags_csv(client: TestClient, auth_headers_admin: dict):
    """Test importing bags via CSV endpoint"""
    import_data = {
        "bags": [
            {
                "name": "Neverfull MM",
                "brand": "Louis Vuitton",
                "color": "Damier Ebene",
                "condition": "good",
                "details": "Classic print",
                "price": 1500.00,
                "authenticity_verified": "true"
            },
            {
                "name": "Marmont Small",
                "brand": "Gucci",
                "color": "Pink",
                "condition": "excellent",
                "details": "Matelassé leather",
                "price": 2200.00,
                "authenticity_verified": "false"
            }
        ]
    }
    
    response = client.post(
        "/api/v1/bags/import-csv",
        json=import_data,
        headers=auth_headers_admin
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 2
    assert data["success"] is True
    assert len(data["errors"]) == 0


def test_get_bag_details(client: TestClient, session: Session, test_admin: Account, auth_headers_admin: dict):
    """Test getting detailed bag information"""
    # Create a test bag
    bag = Bag(
        brand="Hermès",
        model="Kelly 28",
        color="Rouge",
        condition="excellent",
        price=25000.00,
        account_id=test_admin.id
    )
    session.add(bag)
    session.commit()
    session.refresh(bag)
    
    response = client.get(f"/api/v1/bag/{bag.id}", headers=auth_headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["bag"]["id"] == bag.id
    assert data["bag"]["brand"] == "Hermès"
    assert "scripts" in data
    assert "script_count" in data


def test_unauthorized_access(client: TestClient):
    """Test accessing bags without authentication"""
    response = client.get("/api/v1/bags")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated" 