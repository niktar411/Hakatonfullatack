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
                action = entry.action
                subject = entry.data.subject 
                day = entry.details.day
                group = entry.details.group
                building = entry.details.building
                number = entry.details.lessonNumber
                room = entry.data.room
                teacher = entry.data.teacher

                if action == "DELETE_LESSON":  
                    users = await get_users(group_name=group)
                    for user in users:
                        bot.send_message(chat_id=user.user_id, text=f"Предмет {subject} который пройдет в {day} убран из расписания!")
                if action == "UPDATE_LESSON":
                    users = await get_users(group_name=group)
                    for user in users:
                        bot.send_message(chat_id=user.user_id, text=f"Предмет {subject} ")

                
    pass
