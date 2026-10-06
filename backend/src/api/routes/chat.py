from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from fastapi.responses import FileResponse
import os
from src.core.config import settings
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.models.user import User
from src.models.friendship import Friendship, FriendshipStatus
from src.models.chat import Conversation, Message
from src.api.deps import get_current_user
from src.schemas.chat import MessageCreate, MessageResponse, PaginatedMessages
from src.services.storage import storage_service
from src.repositories.friendship import friendship_repo
from src.repositories.chat import conversation_repo, message_repo

router = APIRouter()

def get_or_create_conversation(db: Session, current_user_id: int, friend_id: int):
    # Ensure active friendship exists
    friendship = friendship_repo.get_by_users(db, current_user_id, friend_id)
    
    if not friendship or friendship.status != FriendshipStatus.accepted:
        raise HTTPException(status_code=403, detail="Can only message active friends")
        
    conv = conversation_repo.get_by_users(db, current_user_id, friend_id)
    
    if not conv:
        conv = conversation_repo.create(db, current_user_id, friend_id)
        
    return conv

@router.post("/send/{friend_id}", response_model=MessageResponse)
def send_message(friend_id: int, msg: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id == friend_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
        
    content = msg.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty or just whitespace")
        
    conv = get_or_create_conversation(db, current_user.id, friend_id)
    
    # Idempotency check for network retries
    if msg.client_msg_id:
        existing_msg = message_repo.get_by_client_msg_id(db, msg.client_msg_id)
        if existing_msg:
            return existing_msg
            
    new_message = message_repo.create(
        db,
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=content,
        client_msg_id=msg.client_msg_id
    )
    new_message = message_repo.add_commit_refresh(db, new_message)
    
    return new_message

@router.post("/audio/{friend_id}", response_model=MessageResponse)
async def send_audio_message(
    friend_id: int, 
    file: UploadFile = File(...),
    client_msg_id: str = Form(None),
    audio_duration_ms: int = Form(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.id == friend_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
        
    conv = get_or_create_conversation(db, current_user.id, friend_id)
    
    # Idempotency check for network retries
    if client_msg_id:
        existing_msg = message_repo.get_by_client_msg_id(db, client_msg_id)
        if existing_msg:
            # Generate presigned URL for response if it has audio_url
            if existing_msg.audio_url:
                existing_msg.audio_url = storage_service.get_presigned_url(existing_msg.audio_url)
            return existing_msg

    # Upload to storage
    object_key = await storage_service.upload_audio(file, current_user.id, conv.id)

    new_message = message_repo.create(
        db,
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=None,
        client_msg_id=client_msg_id,
        audio_url=object_key,
        audio_duration_ms=audio_duration_ms
    )
    try:
        new_message = message_repo.add_commit_refresh(db, new_message)
    except Exception as e:
        db.rollback()
        storage_service.delete_audio(object_key)
        raise HTTPException(status_code=500, detail="Database failure")
    
    new_message.audio_url = storage_service.get_presigned_url(object_key)
    return new_message

@router.get("/audio/serve/{file_path:path}")
def serve_audio(
    file_path: str,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Security: Ensure user is part of the conversation
    # Extract conversation_id from file_path "chat_audio/{conversation_id}/{filename}"
    parts = file_path.split("/")
    if len(parts) < 3 or parts[0] != "chat_audio":
        raise HTTPException(status_code=400, detail="Invalid path")
    
    try:
        conv_id = int(parts[1])
        filename = parts[-1]
        # Filename format: {client_msg_id}_{original_filename}
        # Find the message by its audio_url
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation id")
        
    conv = conversation_repo.get_by_id(db, conv_id)
    if not conv or not conversation_repo.is_participant(db, conv.id, current_user.id):
        raise HTTPException(status_code=403, detail="Unauthorized to access this audio")
        
    # Find the message in the DB
    msg = message_repo.get_by_audio_url(db, file_path)
    if msg:
        # Check if the current user is the RECEIVER. 
        # Senders can listen to their own messages infinitely (optional, but standard for Snapchat).
        if msg.sender_id != current_user.id:
            if msg.play_count >= msg.max_plays:
                raise HTTPException(status_code=403, detail="Play limit reached")
            
            # Increment play count atomically
            message_repo.increment_play_count(db, msg)

    full_path = os.path.join(settings.LOCAL_STORAGE_DIR, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    return FileResponse(full_path, media_type="audio/wav")

@router.get("/history/{friend_id}", response_model=PaginatedMessages)
def get_message_history(
    friend_id: int, 
    page: int = Query(1, ge=1), 
    size: int = Query(50, ge=1, le=100), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.id == friend_id:
        raise HTTPException(status_code=400, detail="Cannot fetch history with yourself")

    conv = get_or_create_conversation(db, current_user.id, friend_id)
    
    messages, total = message_repo.get_history(db, conv.id, page, size)
    
    # Generate presigned URLs for audio messages
    for msg in messages:
        if msg.audio_url:
            msg.audio_url = storage_service.get_presigned_url(msg.audio_url)
    
    return {
        "items": messages,
        "total": total,
        "page": page,
        "size": size
    }
