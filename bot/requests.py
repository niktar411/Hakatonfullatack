from sqlalchemy import select
from database import get_session
from database import User


async def set_user(tg_id, tg_username, role):
    async with get_session() as session:
        user = await session.scalar(select(User).where(User.user_id == tg_id))
        if not user:
            session.add(User(user_id=tg_id, username=tg_username, role=role))
            await session.commit()
            return True
        return False