import os
import asyncio
import logging
from handlers import rtr
from aiogram import Bot, Dispatcher
from dotenv import load_dotenv

# ENVIORMENTS
env_get = os.environ.get
load_dotenv()

# MAIN
async def main():
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