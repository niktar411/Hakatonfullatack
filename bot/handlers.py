from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart

rtr = Router()

@rtr.message(CommandStart())
async def start(message: Message):
    await message.answer("Hello World!")