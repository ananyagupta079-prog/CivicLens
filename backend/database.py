from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite = zero setup. For PostgreSQL: "postgresql+psycopg2://user:pass@localhost:5432/civicpulse"
# (then also `pip install psycopg2-binary`).
SQLALCHEMY_DATABASE_URL = "sqlite:///./civicpulse.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
