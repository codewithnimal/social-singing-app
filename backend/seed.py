from src.db.session import SessionLocal
from src.models.user import User
from src.models.friendship import Friendship, FriendshipStatus
from src.models.chat import Message
from src.core.security import get_password_hash

def seed_data():
    db = SessionLocal()
    
    # 1. Create 20 Users
    users = []
    print("Creating 20 users...")
    for i in range(1, 21):
        username = f"testuser_{i}"
        
        # Check if user already exists to avoid unique constraint errors
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            users.append(existing)
            continue
            
        user = User(
            username=username,
            email=f"{username}@example.com",
            hashed_password=get_password_hash("password123")
        )
        db.add(user)
        users.append(user)
        
    db.commit()
    
    for u in users:
        db.refresh(u)
        
    print("Users created.")
    
    # 2. Make testuser_1 friends with users 2, 3, 4, 5
    user1 = users[0]
    print(f"Making {user1.username} friends with users 2-5...")
    
    friends_to_make = users[1:5]
    for friend in friends_to_make:
        # check existing
        existing_friendship = db.query(Friendship).filter(
            ((Friendship.user_id == user1.id) & (Friendship.friend_id == friend.id)) |
            ((Friendship.user_id == friend.id) & (Friendship.friend_id == user1.id))
        ).first()
        
        if not existing_friendship:
            fs = Friendship(user_id=user1.id, friend_id=friend.id, status=FriendshipStatus.accepted)
            db.add(fs)
    db.commit()
    
    # 3. Remove the demo conversation messages but keep both test users and their friendship
    user2 = users[1]
    print(f"Removing demo messages between {user1.username} and {user2.username}...")
    
    from src.repositories.chat import ConversationRepository
    conv_repo = ConversationRepository()
    conv = conv_repo.get_by_users(db, user1.id, user2.id)
    if conv:
        db.query(Message).filter(Message.conversation_id == conv.id).delete(
            synchronize_session=False
        )
        db.commit()
        print("Demo messages removed.")
        
    print("Database successfully seeded with 20 users and friendships.")
    db.close()

if __name__ == "__main__":
    seed_data()
