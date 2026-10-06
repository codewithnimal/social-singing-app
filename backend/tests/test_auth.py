from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.models.user import User
import pytest
import jwt
from src.core.security import SECRET_KEY, ALGORITHM
from datetime import datetime, timedelta, timezone

def test_register_user_happy_path(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "email": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "password" not in data

def test_register_duplicate_user(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={"username": "dupuser", "email": "dup@example.com", "password": "password123"}
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "dupuser", "email": "dup2@example.com", "password": "password123"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username or email already registered"

def test_login_happy_path(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser", "email": "login@example.com", "password": "password123"}
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "loginuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={"username": "invaliduser", "email": "inv@example.com", "password": "password123"}
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "invaliduser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_access_protected_endpoint(client: TestClient):
    client.post(
        "/api/v1/auth/register",
        json={"username": "authuser", "email": "auth@example.com", "password": "password123"}
    )
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "authuser", "password": "password123"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["username"] == "authuser"

def test_access_protected_endpoint_missing_token(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_access_protected_endpoint_expired_token(client: TestClient):
    # Manually generate expired token
    to_encode = {"sub": "fakeuser"}
    expire = datetime.now(timezone.utc) - timedelta(minutes=15)
    to_encode.update({"exp": expire})
    expired_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401

def test_access_protected_endpoint_invalid_token(client: TestClient):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token_xyz"}
    )
    assert response.status_code == 401
