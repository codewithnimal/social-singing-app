from src.db.session import engine
from sqlalchemy import text

def run():
    with engine.connect() as con:
        con.execute(text('ALTER TABLE messages ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0 NOT NULL;'))
        con.execute(text('ALTER TABLE messages ADD COLUMN IF NOT EXISTS max_plays INTEGER DEFAULT 2 NOT NULL;'))
        con.commit()
    print("Migrated successfully")

if __name__ == "__main__":
    run()
