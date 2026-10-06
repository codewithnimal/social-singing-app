import httpx
import wave
import struct
import os

BASE_URL = "http://localhost:8000/api/v1"

def create_dummy_wav(filename="dummy.wav"):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        # Write some silence
        for _ in range(44100):
            value = struct.pack('<h', 0)
            wav_file.writeframesraw(value)
    return filename

def test_flow():
    print("1. Registering/Logging in two users...")
    u1_data = {"username": "test_user1", "email": "user1@test.com", "password": "password123"}
    u2_data = {"username": "test_user2", "email": "user2@test.com", "password": "password123"}
    
    with httpx.Client() as client:
        # Try register, ignore if exists
        client.post(f"{BASE_URL}/auth/register", json=u1_data)
        client.post(f"{BASE_URL}/auth/register", json=u2_data)
        
        # Login expects 'username' according to OAuth2 password form
        r1 = client.post(f"{BASE_URL}/auth/login", data={"username": u1_data["username"], "password": u1_data["password"]})
        if r1.status_code != 200:
            print(f"Login failed for user1 ({r1.status_code}). Make sure the backend is running.")
            return
            
        t1 = r1.json()["access_token"]
        
        r2 = client.post(f"{BASE_URL}/auth/login", data={"username": u2_data["username"], "password": u2_data["password"]})
        t2 = r2.json()["access_token"]
        
        # Get IDs from /auth/me
        user1_id = client.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {t1}"}).json()["id"]
        user2_id = client.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {t2}"}).json()["id"]
        
        print(f"User 1 ID: {user1_id}, User 2 ID: {user2_id}")

        print("2. Setting up friendship...")
        client.post(f"{BASE_URL}/friends/request/{user2_id}", headers={"Authorization": f"Bearer {t1}"})
        client.post(f"{BASE_URL}/friends/accept/{user1_id}", headers={"Authorization": f"Bearer {t2}"})
        
        print("3. Generating dummy audio file...")
        wav_file = create_dummy_wav("test_upload.wav")
        
        print("4. Uploading audio from User 1 to User 2...")
        with open(wav_file, 'rb') as f:
            files = {'file': (wav_file, f, 'audio/wav')}
            data = {'audio_duration_ms': 1000}
            headers = {"Authorization": f"Bearer {t1}"}
            
            upload_resp = client.post(
                f"{BASE_URL}/chat/audio/{user2_id}",
                headers=headers,
                files=files,
                data=data
            )
        
        print("Upload Response:", upload_resp.status_code)
        try:
            print(upload_resp.json())
        except Exception:
            print(upload_resp.text)
        
        if upload_resp.status_code == 200:
            audio_url = upload_resp.json()["audio_url"]
            
            print("\n5. Testing audio download via serve endpoint...")
            download_url = f"http://localhost:8000{audio_url}"
            dl_resp = client.get(download_url, headers={"Authorization": f"Bearer {t2}"})
            
            if dl_resp.status_code == 200:
                print("✅ Successfully downloaded audio file!")
                print(f"Downloaded size: {len(dl_resp.content)} bytes")
            else:
                print("❌ Failed to download:", dl_resp.status_code, dl_resp.text)
                
    # Cleanup
    if os.path.exists(wav_file):
        os.remove(wav_file)

if __name__ == "__main__":
    test_flow()
