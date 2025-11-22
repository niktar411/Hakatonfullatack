import os
import asyncio
import logging
from schedule import scheduler
from aiogram import Bot, Dispatcher
from dotenv import load_dotenv
from schedule import check_and_send_notifications
from handlers import rtr

# ENVIORMENTS
env_get = os.environ.get
load_dotenv()

# MAIN
async def main():
    # SCHEDULE
    scheduler.add_job(check_and_send_notifications, 'interval', minutes=1)
    scheduler.start()
    # BOT
    BOT_TOKEN = env_get("BOT_TOKEN")
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router=rtr)
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