from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from src.models.friendship import Friendship, FriendshipStatus
from src.models.user import User

class FriendshipRepository:
    def get_by_users(self, db: Session, user1_id: int, user2_id: int) -> Optional[Friendship]:
        """Gets a friendship regardless of who sent it"""
        return db.query(Friendship).filter(
            or_(
                and_(Friendship.user_id == user1_id, Friendship.friend_id == user2_id),
                and_(Friendship.user_id == user2_id, Friendship.friend_id == user1_id)
            )
        ).first()

    def get_directed(self, db: Session, sender_id: int, receiver_id: int) -> Optional[Friendship]:
        """Gets a friendship specifically sent by sender_id to receiver_id"""
        return db.query(Friendship).filter(
            Friendship.user_id == sender_id,
            Friendship.friend_id == receiver_id
        ).first()

    def get_user_friendships(self, db: Session, user_id: int) -> List[Friendship]:
        """Gets all friendships for a user (accepted, pending sent, pending received)"""
        return db.query(Friendship).filter(
            or_(Friendship.user_id == user_id, Friendship.friend_id == user_id)
        ).all()

    def create(self, db: Session, sender_id: int, receiver_id: int) -> Friendship:
        new_friendship = Friendship(user_id=sender_id, friend_id=receiver_id, status=FriendshipStatus.pending)
        db.add(new_friendship)
        db.commit()
        db.refresh(new_friendship)
        return new_friendship

    def update_status(self, db: Session, friendship: Friendship, status: FriendshipStatus) -> Friendship:
        friendship.status = status
        db.commit()
        db.refresh(friendship)
        return friendship

    def delete(self, db: Session, friendship: Friendship) -> None:
        db.delete(friendship)
        db.commit()

friendship_repo = FriendshipRepository()
