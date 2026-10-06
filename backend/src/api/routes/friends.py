from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.db.session import get_db
from src.models.user import User
from src.models.friendship import Friendship, FriendshipStatus
from src.api.deps import get_current_user
from src.schemas.friendship import FriendshipResponse, FriendListResponse
from src.schemas.user import UserResponse
from src.repositories.friendship import friendship_repo
from src.repositories.user import user_repo

router = APIRouter()

@router.post("/request/{friend_id}", response_model=FriendshipResponse)
def send_friend_request(friend_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id == friend_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    target_user = user_repo.get_by_id(db, user_id=friend_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing = friendship_repo.get_by_users(db, current_user.id, friend_id)
    
    if existing:
        if existing.status == FriendshipStatus.accepted:
            raise HTTPException(status_code=400, detail="Already friends")
        if existing.status == FriendshipStatus.rejected:
            raise HTTPException(status_code=400, detail="Friendship was previously rejected")
        if existing.user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Friend request already sent")
        else:
            raise HTTPException(status_code=400, detail="User already sent you a request, please accept it")

    new_friendship = friendship_repo.create(db, sender_id=current_user.id, receiver_id=friend_id)
    return new_friendship

@router.post("/accept/{friend_id}", response_model=FriendshipResponse)
def accept_friend_request(friend_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = friendship_repo.get_directed(db, sender_id=friend_id, receiver_id=current_user.id)
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
        
    if friendship.status == FriendshipStatus.accepted:
        raise HTTPException(status_code=400, detail="Friend request already accepted")
        
    if friendship.status == FriendshipStatus.rejected:
        raise HTTPException(status_code=400, detail="Friend request already rejected")

    friendship = friendship_repo.update_status(db, friendship, FriendshipStatus.accepted)
    return friendship

@router.post("/reject/{friend_id}", response_model=FriendshipResponse)
def reject_friend_request(friend_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = friendship_repo.get_directed(db, sender_id=friend_id, receiver_id=current_user.id)
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
        
    if friendship.status == FriendshipStatus.rejected:
        raise HTTPException(status_code=400, detail="Friend request already rejected")

    if friendship.status == FriendshipStatus.accepted:
        raise HTTPException(status_code=400, detail="Cannot reject an already accepted friend. Remove friend instead.")

    friendship = friendship_repo.update_status(db, friendship, FriendshipStatus.rejected)
    return friendship

@router.delete("/remove/{friend_id}")
def remove_friend(friend_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendship = friendship_repo.get_by_users(db, current_user.id, friend_id)
    if not friendship or friendship.status != FriendshipStatus.accepted:
        friendship = None
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Active friendship not found")
        
    friendship_repo.delete(db, friendship)
    return {"detail": "Friend removed successfully"}

@router.get("/list", response_model=FriendListResponse)
def list_friends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    friendships = friendship_repo.get_user_friendships(db, current_user.id)
    
    friends, pending_sent, pending_received = [], [], []
    
    for f in friendships:
        if f.status == FriendshipStatus.accepted:
            other_id = f.friend_id if f.user_id == current_user.id else f.user_id
            other_user = user_repo.get_by_id(db, user_id=other_id)
            if other_user:
                friends.append(other_user)
        elif f.status == FriendshipStatus.pending:
            if f.user_id == current_user.id:
                other_user = user_repo.get_by_id(db, user_id=f.friend_id)
                if other_user:
                    pending_sent.append(other_user)
            else:
                other_user = user_repo.get_by_id(db, user_id=f.user_id)
                if other_user:
                    pending_received.append(other_user)
                    
    return {
        "friends": friends,
        "pending_requests_sent": pending_sent,
        "pending_requests_received": pending_received
    }
