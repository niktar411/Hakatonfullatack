import asyncio
import os
import logging
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import uuid

# Добавил импорт async_sessionmaker
from sqlalchemy import String, BigInteger, Boolean, DateTime
from sqlalchemy.ext.asyncio import (
    create_async_engine, 
    AsyncAttrs, 
    AsyncSession, 
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime

load_dotenv()
logging.basicConfig(level=logging.INFO)

# --- 1. ГЛОБАЛЬНАЯ НАСТРОЙКА БД ---
DB_URL = os.environ.get("DB_URL")

if not DB_URL:
    logging.error("DB_URL not found in .env")
    exit(1)

# Создаем движок глобально, чтобы он был виден везде
engine = create_async_engine(DB_URL, echo=True)

# Создаем фабрику сессий глобально (один раз)
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# --- 2. МОДЕЛИ ---
class Base(AsyncAttrs, DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=True)
    group_name: Mapped[str] = mapped_column(String, nullable=True)

class Event(Base):
    __tablename__ = "events"
    event_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name:Mapped[str] = mapped_column(String, nullable=True)
    teacher: Mapped[str] = mapped_column(String, nullable=True)
    is_even: Mapped[bool] = mapped_column(Boolean, nullable=True)
    group_name: Mapped[str] = mapped_column(String, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    is_notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


# --- 3. ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ---
async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all) 
            
            await conn.run_sync(Base.metadata.create_all)
        logging.info("SUCCESS: Tables created")
    except Exception as e:
        logging.error(f"FAIL: {e}")

# --- 4. ПОЛУЧЕНИЕ СЕССИИ ---
@asynccontextmanager
async def get_session() -> AsyncSession:
    session = async_session_factory()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

# --- 5. ЗАПУСК (Если файл запущен напрямую) ---
if __name__ == "__main__":
    async def main():
        await init_db()
        await engine.dispose()

    asyncio.run(main())