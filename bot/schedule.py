import logging
from aiogram import Bot
from database import Event, User
from requests import get_upcoming_events, get_users
from datetime import datetime, timedelta

async def check_and_send_notifications(bot: Bot):
    pass
