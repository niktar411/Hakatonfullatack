from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart
from requests import set_user


rtr = Router()

@rtr.message(CommandStart())
async def start(message: Message):
    user = message.from_user
    await set_user(tg_id=user.id, tg_username=user.username, role="chmo")
    await message.answer(f"Hello World! {user.username}")