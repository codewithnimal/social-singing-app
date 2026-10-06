from fastapi.testclient import TestClient
import pytest
from string import ascii_lowercase
import random

# Fixtures for dynamically generating users
@pytest.fixture
def users(client: TestClient):
    # Create 20 dummy users for testing
    user_tokens = []
    for i in range(1, 21):
        username = f"chatuser_{i}"
        email = f"chatuser_{i}@test.com"
        client.post("/api/v1/auth/register", json={"username": username, "email": email, "password": "pw"})
        res = client.post("/api/v1/auth/login", data={"username": username, "password": "pw"})
        token = res.json()["access_token"]
        
        # Get ID
        id_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        uid = id_res.json()["id"]
        
        user_tokens.append({
            "id": uid,
            "headers": {"Authorization": f"Bearer {token}"}
        })
    return user_tokens

def make_friends(client, u1, u2):
    client.post(f"/api/v1/friends/request/{u2['id']}", headers=u1['headers'])
    client.post(f"/api/v1/friends/accept/{u1['id']}", headers=u2['headers'])

def test_send_unauthorized_conversation(client: TestClient, users):
    u1, u2 = users[0], users[1]
    # Not friends yet
    res = client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "hello"}, headers=u1['headers'])
    assert res.status_code == 403
    assert "active friends" in res.json()["detail"]

def test_send_to_oneself(client: TestClient, users):
    u1 = users[0]
    res = client.post(f"/api/v1/chat/send/{u1['id']}", json={"content": "hello self"}, headers=u1['headers'])
    assert res.status_code == 400
    assert "yourself" in res.json()["detail"]

def test_empty_message(client: TestClient, users):
    u1, u2 = users[0], users[1]
    make_friends(client, u1, u2)
    
    # Send empty message
    res = client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": ""}, headers=u1['headers'])
    assert res.status_code == 422 # Pydantic validation kicks in

def test_whitespace_message(client: TestClient, users):
    u1, u2 = users[0], users[1]
    res = client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "   "}, headers=u1['headers'])
    assert res.status_code == 400
    assert "empty or just whitespace" in res.json()["detail"]

def test_extremely_long_message(client: TestClient, users):
    u1, u2 = users[0], users[1]
    long_msg = "A" * 2500
    res = client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": long_msg}, headers=u1['headers'])
    assert res.status_code == 422 # Max length is 2000

def test_valid_chat_and_ordering(client: TestClient, users):
    u1, u2 = users[2], users[3]
    make_friends(client, u1, u2)
    
    # Send multiple messages
    client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "Msg 1"}, headers=u1['headers'])
    client.post(f"/api/v1/chat/send/{u1['id']}", json={"content": "Msg 2"}, headers=u2['headers'])
    client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "Msg 3"}, headers=u1['headers'])
    
    # Get history
    res = client.get(f"/api/v1/chat/history/{u2['id']}", headers=u1['headers'])
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    # Order is desc(created_at), so latest is first
    assert data["items"][0]["content"] == "Msg 3"
    assert data["items"][1]["content"] == "Msg 2"
    assert data["items"][2]["content"] == "Msg 1"
    
def test_pagination(client: TestClient, users):
    u1, u2 = users[4], users[5]
    make_friends(client, u1, u2)
    
    for i in range(15):
        client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": f"Msg {i}"}, headers=u1['headers'])
        
    # Get page 1, size 10
    res = client.get(f"/api/v1/chat/history/{u2['id']}?page=1&size=10", headers=u1['headers'])
    data = res.json()
    assert len(data["items"]) == 10
    assert data["items"][0]["content"] == "Msg 14" # desc order
    
    # Get page 2, size 10
    res2 = client.get(f"/api/v1/chat/history/{u2['id']}?page=2&size=10", headers=u1['headers'])
    data2 = res2.json()
    assert len(data2["items"]) == 5
    assert data2["items"][0]["content"] == "Msg 4"
    
    # Get page beyond limit
    res3 = client.get(f"/api/v1/chat/history/{u2['id']}?page=3&size=10", headers=u1['headers'])
    assert len(res3.json()["items"]) == 0

def test_missing_auth(client: TestClient, users):
    u2 = users[1]
    res = client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "hi"})
    assert res.status_code == 401

def test_nonexistent_recipient(client: TestClient, users):
    u1 = users[0]
    # No friendship with 9999
    res = client.post(f"/api/v1/chat/send/9999", json={"content": "hi"}, headers=u1['headers'])
    assert res.status_code == 403

def test_deleted_friendship(client: TestClient, users):
    u1, u2 = users[6], users[7]
    make_friends(client, u1, u2)
    
    # Send a msg
    client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "before delete"}, headers=u1['headers'])
    
    # Delete friendship
    client.delete(f"/api/v1/friends/remove/{u2['id']}", headers=u1['headers'])
    
    # Try sending again
    res = client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "after delete"}, headers=u1['headers'])
    assert res.status_code == 403

def test_network_retry_duplication(client: TestClient, users):
    u1, u2 = users[8], users[9]
    make_friends(client, u1, u2)
    
    # Client sends message with a unique client_msg_id
    payload = {"content": "Hello", "client_msg_id": "uuid-1234-5678"}
    res1 = client.post(f"/api/v1/chat/send/{u2['id']}", json=payload, headers=u1['headers'])
    assert res1.status_code == 200
    msg1 = res1.json()
    
    # Client network glitches, resends the exact same payload
    res2 = client.post(f"/api/v1/chat/send/{u2['id']}", json=payload, headers=u1['headers'])
    assert res2.status_code == 200
    msg2 = res2.json()
    
    # ID must be exactly the same, no new message created
    assert msg1["id"] == msg2["id"]
    
    # Verify only 1 message exists
    history = client.get(f"/api/v1/chat/history/{u2['id']}", headers=u1['headers']).json()
    assert history["total"] == 1

def test_out_of_order_timestamps(client: TestClient, users):
    u1, u2 = users[10], users[11]
    make_friends(client, u1, u2)
    
    # Client tries to send an out-of-order timestamp maliciously or by bug
    payload = {"content": "Hacked time", "created_at": "1990-01-01T00:00:00Z"}
    res = client.post(f"/api/v1/chat/send/{u2['id']}", json=payload, headers=u1['headers'])
    # Pydantic will just ignore the created_at field because it's not in MessageCreate schema
    assert res.status_code == 200
    
    msg = res.json()
    # The year should be the current server year, not 1990
    assert not msg["created_at"].startswith("1990")
    
    # Let's ensure normal sorting is strictly desc server time
    client.post(f"/api/v1/chat/send/{u2['id']}", json={"content": "Second"}, headers=u1['headers'])
    history = client.get(f"/api/v1/chat/history/{u2['id']}", headers=u1['headers']).json()
    assert history["items"][0]["content"] == "Second"
    assert history["items"][1]["content"] == "Hacked time"
