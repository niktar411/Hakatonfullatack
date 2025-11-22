import logging
from aiogram import Bot
from database import Event, User
from requests import get_upcoming_events, get_users
from datetime import datetime, timedelta

async def check_and_send_notifications(bot: Bot):
    events: list[Event] = await get_upcoming_events()
    # for event in events:
    #     users: User = get_users(event.group_name)
    #     for user in users:
    #         await bot.send_message(chat_id=user.user_id, text=f"Hello {user.name}, {event.name} is changed")
    users: list[User] = await get_users()
    for user in users:
        bot.send_message(chat_id=user.user_id, text="SASANIE XYEB")
