import os
import asyncio
import logging
import apscheduler
from handlers import rtr
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher
from schedule import check_and_send_notifications
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# ENVIORMENTS
env_get = os.environ.get
load_dotenv()

# MAIN
async def main():
    # BOT
    BOT_TOKEN = env_get("BOT_TOKEN")
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router=rtr)

    # SCHEDULE
    scheduler = AsyncIOScheduler(timezone="Europe/Moscow")
    scheduler.add_job(check_and_send_notifications, trigger='interval', minutes=1, kwargs={'bot': bot})
    scheduler.start()

    await dp.start_polling(bot)

    


if __name__ == "__main__":
    if (env_get("DEBUG") == "true"):
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot exited")