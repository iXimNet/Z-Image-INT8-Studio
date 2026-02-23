from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./zimage_tasks.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class GenerationTask(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    status = Column(String, default="pending") # pending, processing, completed, failed
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    error_message = Column(Text, nullable=True)
    # Generation parameters
    seed = Column(Integer, nullable=True)
    steps = Column(Integer, nullable=True)
    guidance = Column(Float, nullable=True)
    width = Column(Integer, nullable=True, default=1024)
    height = Column(Integer, nullable=True, default=1024)
    file_size = Column(Integer, nullable=True)  # bytes

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
