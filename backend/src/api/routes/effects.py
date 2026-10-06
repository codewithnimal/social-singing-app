import os
import uuid
import time
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from src.core.config import settings
from src.services.audio_fx import apply_effect, PRESETS
from src.api.deps import get_current_user
from src.models.user import User
import shutil

router = APIRouter()

# Ensure temp directory exists
TEMP_DIR = os.path.join(settings.LOCAL_STORAGE_DIR, "temp_effects")
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/apply")
async def apply_audio_effect(
    file: UploadFile = File(...),
    effect_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    if effect_id not in PRESETS:
        raise HTTPException(status_code=400, detail="Invalid effect_id")
        
    if not file.filename.endswith(".wav"):
        # Very basic check, extend if supporting m4a, etc.
        pass

    # Save original to temp
    req_id = str(uuid.uuid4())
    filename_base = f"{current_user.id}_{req_id}"
    ext = os.path.splitext(file.filename)[1] or '.wav'
    input_path = os.path.join(TEMP_DIR, f"{filename_base}_in{ext}")
    output_path = os.path.join(TEMP_DIR, f"{filename_base}_out.wav")
    
    start_time = time.time()
    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Check size (extremely short/long)
        size = os.path.getsize(input_path)
        if size == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        if size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file too large")

        # Process
        apply_effect(input_path, output_path, effect_id)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Return a serve path that the client can GET to hear the preview
        # We can reuse the chat audio serve logic, or make a temp serve endpoint
        preview_url = f"{settings.API_V1_STR}/audio/effects/serve/{filename_base}_out.wav"
        
        return JSONResponse({
            "url": preview_url,
            "effect_id": effect_id,
            "status": "success",
            "processing_time_ms": processing_time_ms
        })
        
    except HTTPException:
        raise  # re-raise our own 413 etc.
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up input file to save space (keep output for serving)
        # Wrapped in try/except: if a subprocess failed while holding the file open,
        # the delete would raise PermissionError (WinError 32). We suppress it safely.
        try:
            if os.path.exists(input_path):
                os.remove(input_path)
        except OSError:
            pass  # File still held by a failed subprocess — will be cleaned up on next run

@router.get("/serve/{filename}")
def serve_effect_preview(filename: str, current_user: User = Depends(get_current_user)):
    from fastapi.responses import FileResponse
    
    # Security: Prevent IDOR by ensuring the file belongs to the current user
    if not filename.startswith(f"{current_user.id}_"):
        raise HTTPException(status_code=403, detail="Unauthorized to access this preview")
        
    file_path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Preview expired or not found")
    return FileResponse(file_path, media_type="audio/wav")
