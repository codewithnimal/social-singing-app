from fastapi.testclient import TestClient
import pytest

@pytest.fixture
def auth_headers(client: TestClient):
    client.post("/api/v1/auth/register", json={"username": "user1", "email": "user1@test.com", "password": "pw"})
    res = client.post("/api/v1/auth/login", data={"username": "user1", "password": "pw"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture
def user2_headers(client: TestClient):
    client.post("/api/v1/auth/register", json={"username": "user2", "email": "user2@test.com", "password": "pw"})
    res = client.post("/api/v1/auth/login", data={"username": "user2", "password": "pw"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}
    
@pytest.fixture
def user3_headers(client: TestClient):
    client.post("/api/v1/auth/register", json={"username": "user3", "email": "user3@test.com", "password": "pw"})
    res = client.post("/api/v1/auth/login", data={"username": "user3", "password": "pw"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def get_user_id(client, headers):
    return client.get("/api/v1/auth/me", headers=headers).json()["id"]

def test_self_request(client: TestClient, auth_headers):
    uid = get_user_id(client, auth_headers)
    res = client.post(f"/api/v1/friends/request/{uid}", headers=auth_headers)
    assert res.status_code == 400
    assert "yourself" in res.json()["detail"]

def test_duplicate_request(client: TestClient, auth_headers, user2_headers):
    u2_id = get_user_id(client, user2_headers)
    res1 = client.post(f"/api/v1/friends/request/{u2_id}", headers=auth_headers)
    assert res1.status_code == 200
    res2 = client.post(f"/api/v1/friends/request/{u2_id}", headers=auth_headers)
    assert res2.status_code == 400
    assert "already sent" in res2.json()["detail"]

def test_reverse_request(client: TestClient, auth_headers, user3_headers):
    u3_id = get_user_id(client, user3_headers)
    client.post(f"/api/v1/friends/request/{u3_id}", headers=auth_headers)
    
    u1_id = get_user_id(client, auth_headers)
    res = client.post(f"/api/v1/friends/request/{u1_id}", headers=user3_headers)
    assert res.status_code == 400
    assert "already sent you a request" in res.json()["detail"]

def test_already_accepted(client: TestClient, auth_headers, user2_headers):
    # Depending on test ordering, u1 -> u2 request might exist. Let's just create a fresh user.
    client.post("/api/v1/auth/register", json={"username": "user4", "email": "user4@test.com", "password": "pw"})
    res = client.post("/api/v1/auth/login", data={"username": "user4", "password": "pw"})
    u4_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    u4_id = get_user_id(client, u4_headers)
    
    # 1 sends to 4
    client.post(f"/api/v1/friends/request/{u4_id}", headers=auth_headers)
    
    # 4 accepts
    u1_id = get_user_id(client, auth_headers)
    res_accept = client.post(f"/api/v1/friends/accept/{u1_id}", headers=u4_headers)
    assert res_accept.status_code == 200
    
    # 4 tries to accept again
    res_accept2 = client.post(f"/api/v1/friends/accept/{u1_id}", headers=u4_headers)
    assert res_accept2.status_code == 400
    assert "already accepted" in res_accept2.json()["detail"]

    # 1 tries to send request again
    res_req = client.post(f"/api/v1/friends/request/{u4_id}", headers=auth_headers)
    assert res_req.status_code == 400
    assert "Already friends" in res_req.json()["detail"]

def test_already_rejected(client: TestClient, auth_headers):
    # fresh user 5
    client.post("/api/v1/auth/register", json={"username": "user5", "email": "user5@test.com", "password": "pw"})
    res = client.post("/api/v1/auth/login", data={"username": "user5", "password": "pw"})
    u5_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    u5_id = get_user_id(client, u5_headers)
    u1_id = get_user_id(client, auth_headers)
    
    client.post(f"/api/v1/friends/request/{u5_id}", headers=auth_headers)
    client.post(f"/api/v1/friends/reject/{u1_id}", headers=u5_headers)
    
    # 5 rejects again
    res = client.post(f"/api/v1/friends/reject/{u1_id}", headers=u5_headers)
    assert res.status_code == 400
    assert "already rejected" in res.json()["detail"]

def test_remove_nonexistent_friendship(client: TestClient, auth_headers, user3_headers):
    u3_id = get_user_id(client, user3_headers)
    res = client.delete(f"/api/v1/friends/remove/{u3_id}", headers=auth_headers)
    assert res.status_code == 404

def test_deleted_user(client: TestClient, auth_headers):
    res = client.post("/api/v1/friends/request/99999", headers=auth_headers)
    assert res.status_code == 404

def test_unauthorized_request(client: TestClient):
    res = client.post("/api/v1/friends/request/1")
    assert res.status_code == 401
