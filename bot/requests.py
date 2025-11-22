from sqlalchemy import select
from database import get_session
from database import User, Event


async def set_user(tg_id, tg_username):
    async with get_session() as session:
        user = await session.scalar(select(User).where(User.user_id == tg_id))
        if not user:
            session.add(User(user_id=tg_id, username=tg_username))
            await session.commit()
            return True
        return False

async def set_group(tg_id, group):
    async with get_session() as session:
        user = await session.scalar(select(User).where(User.user_id == tg_id))
        user.group_name = group
        session.add(user)
        await session.commit()

async def get_user(tg_id) -> User:
    pass

async def get_users(group_name) -> list[User]:
    async with get_session() as session:
        if group_name == "":
            users = session.scalars(select(User))
        else:
            users = session.scalars(select(User).where(User.group_name == group_name))
        return users
        

async def get_upcoming_events() -> list[Event]:
    async with get_session() as session:
        now = datetime.now()
        target_time_start = now + timedelta(minutes=30)
        target_time_end = target_time_start + timedelta(minutes=1)
        logging.info(f"Events {target_time_start} -> {target_time_end}")
        events = session.scalars(select(Event).where(
                                    Event.date >= target_time_start,
                                    Event.date < target_time_end,
                                    Event.is_notified == False))
        return events