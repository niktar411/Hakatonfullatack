import asyncio
import logging
import apscheduler
from handlers import rtr
from aiogram import Bot, Dispatcher
from schedule import check_and_send_notifications
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import BOT_TOKEN, DEBUG


# MAIN
async def main():
    # BOT
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router=rtr)

    # SCHEDULE
    scheduler = AsyncIOScheduler(timezone="Asia/Yekaterinburg")
    scheduler.add_job(check_and_send_notifications, trigger='interval', seconds=15, kwargs={'bot': bot})
    scheduler.start()

    await dp.start_polling(bot)

if __name__ == "__main__":
    if (DEBUG):
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot exited")