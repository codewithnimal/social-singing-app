from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from src.db.session import get_db
from src.models.user import User
from src.schemas.user import UserResponse
from src.api.deps import get_current_user
from src.repositories.user import user_repo

router = APIRouter()

@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = Query(..., min_length=1, max_length=50, description="Username or email prefix to search"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Basic prefix search on username or email
    users = user_repo.search_by_prefix(db, prefix=q, current_user_id=current_user.id, limit=20)
    
    return users
