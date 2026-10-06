from src.db.session import SessionLocal
from src.models.user import User
from src.models.friendship import Friendship, FriendshipStatus
from src.models.chat import Conversation, Message
from src.core.security import get_password_hash
import random

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
    
    # 3. Create some messages between user1 and user2
    user2 = users[1]
    print(f"Creating messages between {user1.username} and {user2.username}...")
    
    # Get or create conversation
    u1_id, u2_id = min(user1.id, user2.id), max(user1.id, user2.id)
    conv = db.query(Conversation).filter(
        Conversation.user1_id == u1_id, Conversation.user2_id == u2_id
    ).first()
    
    if not conv:
        conv = Conversation(user1_id=u1_id, user2_id=u2_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        
    # Check if messages already exist
    msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
    if msg_count == 0:
        for i in range(1, 16):
            sender = user1 if i % 2 != 0 else user2
            msg = Message(
                conversation_id=conv.id,
                sender_id=sender.id,
                content=f"Hello, this is message number {i} from {sender.username}!"
            )
            db.add(msg)
        db.commit()
        print("Messages created.")
    else:
        print("Messages already exist.")
        
    print("Database successfully seeded with 20 users and chat data.")
    db.close()

if __name__ == "__main__":
    seed_data()
