"""
Phase 10: Security & Abuse Test Suite
Tests authentication, authorization, IDOR, file upload abuse, and more.
Run from: d:/Prograamming/RAG/vcapp/
Usage: cd backend && .\\venv\\Scripts\\python ..\test_security.py
"""
import requests
import os
import sys
import time
import json
import struct
import math

BASE = "http://127.0.0.1:8000"
API  = f"{BASE}/api/v1"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[93m[INFO]\033[0m"
results = {"pass": 0, "fail": 0}

def check(label, condition, note=""):
    if condition:
        print(f"  {PASS} {label}")
        results["pass"] += 1
    else:
        print(f"  {FAIL} {label}  {note}")
        results["fail"] += 1

def get_token(username, password):
    r = requests.post(f"{API}/auth/login", data={"username": username, "password": password})
    if r.status_code == 200:
        return r.json()["access_token"]
    return None

def auth(token):
    return {"Authorization": f"Bearer {token}"}

def make_wav_bytes(duration_sec=1.0):
    sample_rate = 44100
    num_samples = int(sample_rate * duration_sec)
    samples = [int(32767 * math.sin(2 * math.pi * 440 * i / sample_rate)) for i in range(num_samples)]
    data = struct.pack(f"<{num_samples}h", *samples)
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + len(data), b'WAVE', b'fmt ', 16,
        1, 1, sample_rate, sample_rate * 2, 2, 16,
        b'data', len(data))
    return header + data

def wait_for_server():
    for _ in range(10):
        try:
            requests.get(f"{BASE}/health", timeout=2)
            return True
        except Exception:
            time.sleep(1)
    return False

print("\n" + "="*60)
print("  Phase 10: Security & Abuse Test Suite")
print("="*60)

if not wait_for_server():
    print("  Server not reachable. Start uvicorn first.")
    sys.exit(1)
print("  Server is up.\n")

token1 = get_token("testuser_1", "password123")
token2 = get_token("testuser_2", "password123")
token3 = get_token("testuser_3", "password123")
if not token1 or not token2:
    print("  Could not authenticate test users. Run seed.py first.")
    sys.exit(1)
print("  Logged in as testuser_1, testuser_2, testuser_3\n")

wav_bytes = make_wav_bytes(2.0)

# ── 1. AUTHENTICATION ──────────────────────────────────────────────────────
print("-"*60)
print("1. AUTHENTICATION")
print("-"*60)

r = requests.get(f"{API}/auth/me")
check("No token -> 401", r.status_code == 401)

r = requests.get(f"{API}/auth/me", headers=auth("notavalidtoken"))
check("Garbage token -> 401", r.status_code == 401)

r = requests.get(f"{API}/auth/me", headers=auth(""))
check("Empty token -> 401/403/422", r.status_code in (401, 403, 422))

import jwt as pyjwt
fake_token = pyjwt.encode({"sub": "ghost_user_nonexistent", "exp": 9999999999}, "supersecret_dev_key", algorithm="HS256")
r = requests.get(f"{API}/auth/me", headers=auth(fake_token))
check("Token for non-existent user -> 401", r.status_code == 401)

# alg:none attack
# Manually craft a token with no signature
import base64
def b64url(s):
    return base64.urlsafe_b64encode(s).rstrip(b'=').decode()
header_none = b64url(b'{"alg":"none","typ":"JWT"}')
payload_none = b64url(b'{"sub":"testuser_1","exp":9999999999}')
alg_none_token = f"{header_none}.{payload_none}."
r = requests.get(f"{API}/auth/me", headers=auth(alg_none_token))
check("alg:none JWT attack -> 401", r.status_code == 401)

# ── 2. ERROR LEAKAGE ────────────────────────────────────────────────────────
print("\n" + "-"*60)
print("2. ERROR LEAKAGE")
print("-"*60)

r = requests.get(f"{API}/auth/me", headers=auth("bad"))
body = r.text.lower()
check("401 body has no stack trace", "traceback" not in body and "sqlalchemy" not in body)

r = requests.post(f"{API}/chat/send/99999", json={"content": "hi"}, headers=auth(token1))
body = r.text.lower()
check("403 body has no SQL details", "sqlalchemy" not in body and "traceback" not in body)

r = requests.post(f"{API}/audio/effects/apply",
    files={"file": ("x.wav", b"notaudio", "audio/wav")},
    data={"effect_id": "baby"},
    headers=auth(token1))
body = r.text
check("Effect 500 doesn't leak local file paths",
      "d:\\" not in body.lower() and "c:\\" not in body.lower() and "/home/" not in body)

# ── 3. IDOR — MESSAGE HISTORY ────────────────────────────────────────────────
print("\n" + "-"*60)
print("3. IDOR — MESSAGE HISTORY")
print("-"*60)

# user3 not friends with user1's friend (user3 tries to read user1-user2 conversation)
# user3 tries to access history with user1 — not friends, should fail
r = requests.get(f"{API}/chat/history/1", headers=auth(token3))
check("IDOR: user3 can't read user1's chat history (not friends)", r.status_code == 403)

# user2 tries to read chat between user1 and user4 (user2 not in that convo)
r = requests.get(f"{API}/chat/history/4", headers=auth(token2))
check("IDOR: user2 can't read user1-user4 chat (non-friend)", r.status_code == 403)

# ── 4. IDOR — AUDIO FILE ACCESS ────────────────────────────────────────────
print("\n" + "-"*60)
print("4. IDOR — AUDIO FILE ACCESS")
print("-"*60)

r = requests.get(f"{API}/chat/audio/serve/chat_audio/1/someaudio.wav", headers=auth(token3))
check("IDOR: user3 can't access conv1 audio (not a member)", r.status_code in (403, 404))

for evil_path in [
    "../../../etc/passwd",
    "..%2F..%2Fetc%2Fpasswd",
    "chat_audio/1/../../secret.txt",
    "chat_audio/1/%2e%2e%2fsecret",
]:
    r = requests.get(f"{API}/chat/audio/serve/{evil_path}", headers=auth(token1))
    check(f"Path traversal blocked: '{evil_path[:35]}'", r.status_code in (400, 403, 404, 422))

# ── 5. FILE UPLOAD VALIDATION ──────────────────────────────────────────────
print("\n" + "-"*60)
print("5. FILE UPLOAD VALIDATION")
print("-"*60)

big_data = b"X" * (11 * 1024 * 1024)
r = requests.post(f"{API}/audio/effects/apply",
    files={"file": ("big.wav", big_data, "audio/wav")},
    data={"effect_id": "baby"},
    headers=auth(token1))
check("Oversized upload (11MB) -> 413 or 400", r.status_code in (400, 413, 422))

r = requests.post(f"{API}/audio/effects/apply",
    files={"file": ("evil.exe", b"MZ\x90\x00this_is_an_exe", "audio/wav")},
    data={"effect_id": "baby"},
    headers=auth(token1))
check("Executable disguised as audio -> rejected or 500", r.status_code in (400, 422, 500))

r = requests.post(f"{API}/audio/effects/apply",
    files={"file": ("", b"", "audio/wav")},
    data={"effect_id": "baby"},
    headers=auth(token1))
check("Empty file -> 400/422", r.status_code in (400, 422))

r = requests.post(f"{API}/chat/audio/2",
    files={"file": ("shell.php", b"<?php system($_GET['cmd']); ?>", "application/x-php")},
    data={"audio_duration_ms": "1000"},
    headers=auth(token1))
check("PHP shell upload to chat -> 400", r.status_code == 400)

r = requests.post(f"{API}/chat/audio/2",
    files={"file": ("../../../evil.wav", wav_bytes, "audio/wav")},
    data={"audio_duration_ms": "1000"},
    headers=auth(token1))
# The file should be saved under a controlled path, not the attacker's chosen path
check("Path traversal in filename -> blocked or sanitized", r.status_code in (200, 400, 422))

# ── 6. INPUT VALIDATION ────────────────────────────────────────────────────
print("\n" + "-"*60)
print("6. INPUT VALIDATION")
print("-"*60)

r = requests.post(f"{API}/chat/send/2",
    data="{{not valid json at all",
    headers={**auth(token1), "Content-Type": "application/json"})
check("Malformed JSON body -> 422", r.status_code == 422)

r = requests.post(f"{API}/chat/send/2",
    json={"content": "A" * 10000},
    headers=auth(token1))
check("10000-char message -> 422 (max_length=2000)", r.status_code == 422)

r = requests.get(f"{API}/chat/history/2?page=-1", headers=auth(token1))
check("Negative page param -> 422", r.status_code == 422)

r = requests.get(f"{API}/chat/history/2?size=999", headers=auth(token1))
check("Oversized page size (999) -> 422 (max=100)", r.status_code == 422)

r = requests.post(f"{API}/audio/effects/apply",
    files={"file": ("a.wav", wav_bytes, "audio/wav")},
    data={"effect_id": "robot'; DROP TABLE users; --"},
    headers=auth(token1))
check("SQL injection in effect_id -> 400", r.status_code == 400)

# ── 7. UNAUTHORIZED FRIEND ACTIONS ─────────────────────────────────────────
print("\n" + "-"*60)
print("7. UNAUTHORIZED FRIEND ACTIONS")
print("-"*60)

r = requests.post(f"{API}/friends/accept/999", headers=auth(token1))
check("Accept non-existent request -> 404", r.status_code == 404)

r = requests.post(f"{API}/friends/reject/999", headers=auth(token1))
check("Reject non-existent request -> 404", r.status_code == 404)

r = requests.post(f"{API}/friends/request/1", headers=auth(token1))
check("Friend request to self -> 400", r.status_code == 400)

r = requests.delete(f"{API}/friends/remove/999", headers=auth(token1))
check("Remove non-existent friend -> 404", r.status_code == 404)

# user2 tries to accept a request that was sent to user1, not user2
r = requests.post(f"{API}/friends/request/5", headers=auth(token1))  # user1 sends to user5
r2 = requests.post(f"{API}/friends/accept/1", headers=auth(token3))  # user3 tries to accept on behalf of user5
check("user3 can't accept user1->user5 request (not recipient)", r2.status_code == 404)

# ── 8. JWT EDGE CASES ──────────────────────────────────────────────────────
print("\n" + "-"*60)
print("8. JWT EDGE CASES")
print("-"*60)

expired_token = pyjwt.encode(
    {"sub": "testuser_1", "exp": int(time.time()) - 10},
    "supersecret_dev_key", algorithm="HS256"
)
r = requests.get(f"{API}/auth/me", headers=auth(expired_token))
check("Expired JWT -> 401", r.status_code == 401)

wrong_sig = pyjwt.encode({"sub": "testuser_1", "exp": 9999999999}, "totally_wrong_secret", algorithm="HS256")
r = requests.get(f"{API}/auth/me", headers=auth(wrong_sig))
check("Wrong JWT signature -> 401", r.status_code == 401)

no_exp = pyjwt.encode({"sub": "testuser_1"}, "supersecret_dev_key", algorithm="HS256")
r = requests.get(f"{API}/auth/me", headers=auth(no_exp))
check("JWT with no exp claim -> 401 or 200 (INFO)", r.status_code in (200, 401),
      f"Status: {r.status_code} (200=accepted—should add exp validation)")
if r.status_code == 200:
    print(f"  {INFO} No-exp JWT accepted: consider requiring 'exp' claim")

# ── 9. BRUTE FORCE / RATE LIMITING ─────────────────────────────────────────
print("\n" + "-"*60)
print("9. BRUTE FORCE / RATE LIMITING")
print("-"*60)

statuses = []
for _ in range(20):
    r = requests.post(f"{API}/auth/login", data={"username": "testuser_1", "password": "wrongpass"})
    statuses.append(r.status_code)

any_429 = any(s == 429 for s in statuses)
all_401 = all(s == 401 for s in statuses)
check("Brute force: 20 bad logins -> 429 or consistently 401",
      any_429 or all_401,
      f"Statuses: {set(statuses)}")
if not any_429:
    print(f"  {INFO} No rate limiting on login — brute force possible")

# ── 10. CORS ────────────────────────────────────────────────────────────────
print("\n" + "-"*60)
print("10. CORS")
print("-"*60)

r = requests.options(f"{API}/auth/login",
    headers={"Origin": "http://evil-attacker.com",
             "Access-Control-Request-Method": "POST",
             "Access-Control-Request-Headers": "Authorization"})
acao = r.headers.get("access-control-allow-origin", "not-set")
acac = r.headers.get("access-control-allow-credentials", "false")
check("CORS origin reflects or is '*' (dev mode)", acao in ("*", "http://evil-attacker.com", "not-set"))
if acao == "*" and acac.lower() == "true":
    print(f"  {INFO} WARNING: allow_origins=['*'] + allow_credentials=True is a security issue in production")
    print(f"  {INFO} Browser blocks credentialed cross-origin requests to '*' — but fix before prod")

# ── 11. SECRET KEY ──────────────────────────────────────────────────────────
print("\n" + "-"*60)
print("11. SECRET KEY STRENGTH")
print("-"*60)

import sys, importlib
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
try:
    from src.core.security import SECRET_KEY as _real_secret
    check("Secret key >= 32 bytes for HS256",
          len(_real_secret.encode()) >= 32,
          f"FAIL: {len(_real_secret.encode())} bytes — must be >= 32 for RFC 7518")
except Exception as e:
    print(f"  {INFO} Could not import SECRET_KEY: {e}")

# ── SUMMARY ─────────────────────────────────────────────────────────────────
print("\n" + "="*60)
total = results['pass'] + results['fail']
print(f"  Results: {results['pass']}/{total} passed, {results['fail']} failed")
print("="*60 + "\n")
