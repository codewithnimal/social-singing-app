"""
Test suite for Baby & Cattish audio effect endpoints.
Tests: valid effects, edge cases, auth, invalid inputs.
"""

import os
import sys
import time
import struct
import wave
import threading

import requests

BASE_URL = "http://127.0.0.1:8000"
API = f"{BASE_URL}/api/v1"

PASS = "[PASS]"
FAIL = "[FAIL]"

# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────

def get_token(username: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login",
                      data={"username": username, "password": password},
                      timeout=10)
    r.raise_for_status()
    return r.json()["access_token"]


def make_wav(path: str, duration_sec: float = 2.0,
             sample_rate: int = 44100, silent: bool = False):
    """Write a minimal valid PCM WAV file."""
    import math
    n = int(sample_rate * duration_sec)
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = []
        for i in range(n):
            val = 0 if silent else int(32000 * math.sin(2 * 3.14159 * 440 * i / sample_rate))
            frames.append(struct.pack("<h", val))
        wf.writeframes(b"".join(frames))


def post_effect(token: str, file_path: str, effect_id: str,
                content_type: str = "audio/wav"):
    headers = {"Authorization": f"Bearer {token}"}
    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        files = {"file": (filename, f, content_type)}
        data = {"effect_id": effect_id}
        r = requests.post(f"{API}/audio/effects/apply",
                          headers=headers, files=files, data=data, timeout=30)
    return r


def check(label: str, response, expected_status: int):
    ok = response.status_code == expected_status
    sym = PASS if ok else FAIL
    try:
        body = response.json()
    except Exception:
        body = response.text[:100]

    if ok and response.status_code == 200:
        ms = body.get("processing_time_ms", "?")
        print(f"  {sym} {label} -> effect={body.get('effect_id')}, {ms}ms")
    elif ok:
        print(f"  {sym} {label} -> {body}")
    else:
        print(f"  {FAIL} {label} -> expected {expected_status}, got {response.status_code}: {body}")


# ──────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────

def main():
    print()
    print("=" * 60)
    print("  Baby & Cattish Effects API  --  Edge Case Test Suite")
    print("=" * 60)

    # Wait for server to be up
    print("\nWaiting for server...")
    for i in range(20):
        try:
            requests.get(f"{BASE_URL}/health", timeout=2)
            print("  Server is up!")
            break
        except Exception:
            time.sleep(1)
    else:
        print("  Server not reachable after 20s. Start it first.")
        sys.exit(1)

    # Auth
    print("\nAuthenticating...")
    token = None
    for creds in [("testuser_1", "password123"), ("testuser_2", "password123"),
                  ("niranjan", "testpass"), ("ranju", "testpass")]:
        try:
            token = get_token(*creds)
            print(f"  Logged in as: {creds[0]}")
            break
        except Exception:
            continue
    if not token:
        print("  AUTH FAILED -- check credentials or seed the DB")
        sys.exit(1)

    # Temp files
    tmp = "backend/data/audio/test_temp"
    os.makedirs(tmp, exist_ok=True)
    normal_wav  = f"{tmp}/normal.wav"
    short_wav   = f"{tmp}/short.wav"
    silent_wav  = f"{tmp}/silent.wav"
    empty_file  = f"{tmp}/empty.wav"
    fake_file   = f"{tmp}/fake.wav"

    make_wav(normal_wav, duration_sec=3.0)
    make_wav(short_wav,  duration_sec=0.1)
    make_wav(silent_wav, duration_sec=2.0, silent=True)
    open(empty_file, "w").close()
    with open(fake_file, "wb") as f:
        f.write(b"THIS IS NOT AUDIO DATA AT ALL!!!")

    # ── 1. Happy path ──────────────────────────────────────
    print("\n" + "-"*60)
    print("1. HAPPY PATH -- Normal 3s audio")
    print("-"*60)
    check("Baby   - normal WAV",   post_effect(token, normal_wav, "baby"),    200)
    check("Cattish - normal WAV",  post_effect(token, normal_wav, "cattish"), 200)
    check("Deep    - normal WAV",  post_effect(token, normal_wav, "deep"),    200)
    check("Echo    - normal WAV",  post_effect(token, normal_wav, "echo"),    200)

    print("\n" + "-"*60)
    print("2. VERY SHORT AUDIO (100ms)")
    print("-"*60)
    check("Baby   - 100ms WAV",   post_effect(token, short_wav, "baby"),    200)
    check("Cattish - 100ms WAV",  post_effect(token, short_wav, "cattish"), 200)
    check("Deep    - 100ms WAV",  post_effect(token, short_wav, "deep"),    200)
    check("Echo    - 100ms WAV",  post_effect(token, short_wav, "echo"),    200)

    # ── 3. Silent ─────────────────────────────────────────
    print("\n" + "-"*60)
    print("3. SILENT AUDIO (all zeros)")
    print("-"*60)
    check("Baby   - silent WAV",   post_effect(token, silent_wav, "baby"),    200)
    check("Cattish - silent WAV",  post_effect(token, silent_wav, "cattish"), 200)

    # ── 4. Empty file ─────────────────────────────────────
    print("\n" + "-"*60)
    print("4. EMPTY FILE (0 bytes) -- expect 400")
    print("-"*60)
    check("Baby   - empty",   post_effect(token, empty_file, "baby"),    400)
    check("Cattish - empty",  post_effect(token, empty_file, "cattish"), 400)

    # ── 5. Corrupt file ───────────────────────────────────
    print("\n" + "-"*60)
    print("5. CORRUPT / FAKE FILE -- expect 400 or 500")
    print("-"*60)
    r_baby    = post_effect(token, fake_file, "baby")
    r_cattish = post_effect(token, fake_file, "cattish")
    for label, r in [("Baby - fake", r_baby), ("Cattish - fake", r_cattish)]:
        ok = r.status_code in (400, 500)
        sym = PASS if ok else FAIL
        print(f"  {sym} {label} -> {r.status_code} (accepted: 400 or 500)")

    # ── 6. Invalid effect ID ──────────────────────────────
    print("\n" + "-"*60)
    print("6. INVALID EFFECT ID -- expect 400")
    print("-"*60)
    check("Unknown effect (robot)",   post_effect(token, normal_wav, "robot"), 400)
    check("Unknown effect (machine)", post_effect(token, normal_wav, "machine"), 400)

    # ── 7. Auth ───────────────────────────────────────────
    print("\n" + "-"*60)
    print("7. AUTHENTICATION CHECKS")
    print("-"*60)
    with open(normal_wav, "rb") as f:
        r_no_token = requests.post(
            f"{API}/audio/effects/apply",
            files={"file": ("x.wav", f, "audio/wav")},
            data={"effect_id": "baby"}, timeout=10)
    check("No token -> 401", r_no_token, 401)

    with open(normal_wav, "rb") as f:
        r_bad_token = requests.post(
            f"{API}/audio/effects/apply",
            headers={"Authorization": "Bearer fake.token.here"},
            files={"file": ("x.wav", f, "audio/wav")},
            data={"effect_id": "baby"}, timeout=10)
    check("Bad token -> 401", r_bad_token, 401)

    # ── 8. Concurrency ────────────────────────────────────
    print("\n" + "-"*60)
    print("8. 5 SIMULTANEOUS REQUESTS (concurrency)")
    print("-"*60)
    results_lock  = threading.Lock()
    concurrent_results = []
    def fire():
        rr = post_effect(token, normal_wav, "baby")
        with results_lock:
            concurrent_results.append(rr.status_code)
    threads = [threading.Thread(target=fire) for _ in range(5)]
    for t in threads: t.start()
    for t in threads: t.join()
    all_ok = all(s == 200 for s in concurrent_results)
    sym = PASS if all_ok else FAIL
    print(f"  {sym} 5 simultaneous results: {concurrent_results}")

    print()
    print("=" * 60)
    print("  Test suite complete!")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
