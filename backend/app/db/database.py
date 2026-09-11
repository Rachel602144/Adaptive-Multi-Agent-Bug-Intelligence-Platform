"""Database models + session (PostgreSQL in production, SQLite locally)."""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app import config

connect_args = {"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(config.DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")


class Module(Base):
    __tablename__ = "modules"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    team: Mapped[str] = mapped_column(String(80))
    keywords: Mapped[str] = mapped_column(Text, default="")


class HistoricalBug(Base):
    __tablename__ = "historical_bugs"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(20))
    module: Mapped[str] = mapped_column(String(80), default="")
    team: Mapped[str] = mapped_column(String(80), default="")
    source: Mapped[str] = mapped_column(String(80), default="")


class Bug(Base):
    __tablename__ = "bugs"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    stack_trace: Mapped[str | None] = mapped_column(Text, nullable=True)
    environment: Mapped[str | None] = mapped_column(Text, nullable=True)
    mode: Mapped[str] = mapped_column(String(20), default="adaptive")
    status: Mapped[str] = mapped_column(String(20), default="received")  # received | triaged | failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # full final state for the UI


class AgentResult(Base):
    __tablename__ = "agent_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    bug_id: Mapped[int] = mapped_column(ForeignKey("bugs.id"), index=True)
    agent: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20))
    ms: Mapped[int] = mapped_column(Integer, default=0)
    llm_calls: Mapped[int] = mapped_column(Integer, default=0)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(80), default="")
    output: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Recommendation(Base):
    __tablename__ = "recommendations"
    id: Mapped[int] = mapped_column(primary_key=True)
    bug_id: Mapped[int] = mapped_column(ForeignKey("bugs.id"), unique=True)
    priority: Mapped[str] = mapped_column(String(5))
    severity: Mapped[str] = mapped_column(String(20))
    team: Mapped[str] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(40), default="")
    module: Mapped[str] = mapped_column(String(80), default="")
    recommended_action: Mapped[str] = mapped_column(Text)
    target_release: Mapped[str] = mapped_column(String(60))
    estimated_resolution: Mapped[str] = mapped_column(String(40))
    possible_cause: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duplicate_score: Mapped[float] = mapped_column(Float, default=0.0)


class ProcessingHistory(Base):
    __tablename__ = "processing_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    bug_id: Mapped[int] = mapped_column(ForeignKey("bugs.id"), index=True)
    event: Mapped[str] = mapped_column(String(40))
    detail: Mapped[str] = mapped_column(Text, default="")
    total_ms: Mapped[int] = mapped_column(Integer, default=0)
    llm_calls: Mapped[int] = mapped_column(Integer, default=0)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Comparison(Base):
    """Adaptive vs static run of the same bug (research ablation). Not part of the duplicate corpus."""
    __tablename__ = "comparisons"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    adaptive: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    static: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


def init_db():
    Base.metadata.create_all(engine)
