from pydantic import BaseModel
from typing import List
from datetime import datetime
from src.models.friendship import FriendshipStatus
from src.schemas.user import UserResponse

class FriendshipResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: FriendshipStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FriendListResponse(BaseModel):
    friends: List[UserResponse]
    pending_requests_sent: List[UserResponse]
    pending_requests_received: List[UserResponse]
