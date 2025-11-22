from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from requests import set_user, set_group
from aiogram.fsm.state import StatesGroup, State


class Registration(StatesGroup):
    waiting = State() 

rtr = Router()

@rtr.message(CommandStart())
async def start(message: Message, state: FSMContext):
    user = message.from_user
    await state.set_state(Registration.waiting)
    await set_user(tg_id=user.id, tg_username=user.username)
    await message.answer(f"Hello {user.username}!\nType ur group")

@rtr.message(Registration.waiting)
async def add_group(message: Message, state: FSMContext):
    user = message.from_user
    group_name = message.text.strip()
    await set_group(tg_id=user.id, group=group_name)
    await message.answer("success")