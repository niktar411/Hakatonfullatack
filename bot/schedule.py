import logging
from aiogram import Bot
from datetime import Event, User
from datetime import datetime, timedelta

async def check_and_send_notifications(bot: Bot):
    events: list[Event] = get_upcoming_events()
    for event in events:
        users: User = get_users(event.group_name)
        for user in users:
            await bot.send_message(chat_id=user.user_id, text=f"Hello {user.name}, {event.name} upcoming in 30 min")