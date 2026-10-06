from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class MessageCreate(BaseModel):
    content: Optional[str] = Field(None, max_length=2000, description="Text content of the message")
    client_msg_id: Optional[str] = Field(None, description="Optional UUID from client to prevent duplicate sends")
    audio_duration_ms: Optional[int] = Field(None, description="Optional audio duration in milliseconds")

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    client_msg_id: Optional[str]
    content: Optional[str]
    audio_url: Optional[str]
    audio_duration_ms: Optional[int]
    play_count: int
    max_plays: int
    created_at: datetime

    class Config:
        from_attributes = True

class PaginatedMessages(BaseModel):
    items: List[MessageResponse]
    total: int
    page: int
    size: int
