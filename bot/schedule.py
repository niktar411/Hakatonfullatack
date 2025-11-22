import logging
from aiogram import Bot
from database import Event, User
from requests import get_users, get_journal_from_api
from deserialize import Journal, LogEntry
from datetime import datetime, timedelta

async def check_and_send_notifications(bot: Bot):
    journal: Journal = get_journal_from_api()
    if journal == None:
        logging.info("journal is None")
    else:
        for entry in journal.entries:
            date = entry.timestamp
            now = datetime.now()
            if (date < now and (date + timedelta(seconds=60)) > now):
                group = entry.details.group
                building = entry.details.building
                day = entry.details.day
                lesson = entry.details.lessonNumber

            


    pass
