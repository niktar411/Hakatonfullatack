import logging
import aiohttp
from datetime import datetime, timedelta
from typing import Optional, Dict, List

from sqlalchemy import select

from config import BASE_URL
from database import get_session, User, Event
from deserialize import DaySchedule, Journal, parse_journal, parse_schedule


async def set_user(tg_id: int, tg_username: str) -> bool:
    async with get_session() as session:
        result = await session.execute(select(User).where(User.user_id == tg_id))
        user = result.scalar_one_or_none()
        
        if not user:
            session.add(User(user_id=tg_id, username=tg_username))
            await session.commit()
            return True
        return False


async def set_group(tg_id: int, group: str):
    async with get_session() as session:
        result = await session.execute(select(User).where(User.user_id == tg_id))
        user = result.scalar_one_or_none()
        
        if user:
            user.group_name = group
            await session.commit()
        else:
            logging.warning(f"User {tg_id} not found for set_group")


async def get_user(tg_id: int) -> Optional[User]:
    async with get_session() as session:
        result = await session.execute(select(User).where(User.user_id == tg_id))
        return result.scalar_one_or_none()


async def get_users(group_name: str = "") -> list[User]:
    async with get_session() as session:
        if group_name:
            stmt = select(User).where(User.group_name == group_name)
        else:
            stmt = select(User)

        result = await session.execute(stmt)
        users = result.scalars().all()
        return list(users)


async def get_upcoming_events() -> list[Event]:
    async with get_session() as session:
        now = datetime.now()
        target_time_start = now + timedelta(minutes=30)
        target_time_end = target_time_start + timedelta(minutes=1)
        
        logging.info(f"Checking events: {target_time_start} -> {target_time_end}")
        
        stmt = select(Event).where(
            Event.date >= target_time_start,
            Event.date < target_time_end,
            Event.is_notified == False
        )
        result = await session.execute(stmt)
        events = result.scalars().all()
        return list(events)


async def get_schedule_from_api() -> Optional[Dict]:
    url = f"{BASE_URL}/api/schedule"
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return parse_schedule(data)
                else:
                    logging.info(f"Ошибка API: {response.status}")
                    return None
        except Exception as e:
            logging.info(f"Не удалось подключиться: {e}")
            return None


async def get_journal_from_api() -> Optional[Journal]:
    url = f"{BASE_URL}/api/journal"
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return parse_journal(data) 
                else:
                    logging.info(f"Ошибка API: {response.status}")
                    return None
        except Exception as e:
            logging.info(f"Не удалось подключиться: {e}")
            return None