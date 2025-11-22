import asyncio
import os
import logging
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Добавил импорт async_sessionmaker
from sqlalchemy import String, BigInteger
from sqlalchemy.ext.asyncio import (
    create_async_engine, 
    AsyncAttrs, 
    AsyncSession, 
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

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
    role: Mapped[str] = mapped_column(String, nullable=False)

# --- 3. ИНИЦИАЛИЗАЦИЯ ТАБЛИЦ ---
async def init_db():
    try:
        async with engine.begin() as conn:
            # ВНИМАНИЕ: drop_all УДАЛИТ ВСЕ ДАННЫЕ! Оставьте только для тестов.
            # Для продакшена уберите эту строку.
            await conn.run_sync(Base.metadata.drop_all) 
            
            await conn.run_sync(Base.metadata.create_all)
        logging.info("SUCCESS: Tables created")
    except Exception as e:
        logging.error(f"FAIL: {e}")

# --- 4. ПОЛУЧЕНИЕ СЕССИИ ---
@asynccontextmanager
async def get_session() -> AsyncSession:
    # Создаем новую сессию из глобальной фабрики
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