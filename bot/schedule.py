import logging
from aiogram import Bot
from datetime import datetime

# Ваши модули
from requests import get_journal_from_api, get_users
from deserialize import Journal, LogEntry
from storage import get_last_check_time, save_last_check_time

async def check_and_send_notifications(bot: Bot):
    """
    Периодическая задача: проверяет журнал изменений и рассылает уведомления.
    """
    # 1. Загружаем время, на котором остановились в прошлый раз
    last_check = await get_last_check_time()
    
    # 2. Получаем журнал с API
    try:
        journal: Journal = await get_journal_from_api()
    except Exception as e:
        logging.error(f"Ошибка при получении журнала с API: {e}")
        return

    if journal is None or not journal.entries:
        return

    # 3. Фильтрация и Сортировка
    # Берем только новые события (timestamp > last_check)
    # И сортируем их от старых к новым, чтобы отправлять в правильном порядке
    new_entries = sorted(
        [e for e in journal.entries if e.timestamp > last_check],
        key=lambda x: x.timestamp
    )

    if not new_entries:
        return  # Новых событий нет

    logging.info(f"Найдено {len(new_entries)} новых событий после {last_check}")

    # 4. Обработка событий
    processed_count = 0
    
    for entry in new_entries:
        action = entry.action
        details = entry.details
        group = details.group
        day = details.day
        lesson_num = details.lessonNumber

        # Получаем пользователей группы
        users = await get_users(group_name=group)
        if not users:
            logging.info(f"Событие для группы {group}, но подписчиков нет.")
            processed_count += 1
            continue

        text = ""

        # --- ЛОГИКА: ДОБАВЛЕНИЕ УРОКА ---
        if action == "ADD_LESSON":
            data = details.data
            if data:
                text = (
                    f"🆕 <b>В расписание добавлена пара!</b>\n\n"
                    f"📅 День: {day}\n"
                    f"🕐 Пара №{lesson_num}\n"
                    f"📖 Предмет: <b>{data.subject}</b>\n"
                    f"👨‍🏫 Препод: {data.teacher}\n"
                    f"🚪 Кабинет: {data.room}"
                )

        # --- ЛОГИКА: УДАЛЕНИЕ УРОКА ---
        elif action == "DELETE_LESSON":
            # При удалении данные могут быть в data или oldData
            data = details.data or details.oldData
            if data:
                text = (
                    f"🗑 <b>Внимание! Отмена пары!</b>\n\n"
                    f"📅 День: {day}\n"
                    f"🕐 Пара №{lesson_num}\n"
                    f"📖 Предмет: <b>{data.subject}</b>\n"
                    f"❌ Убран из расписания!"
                )

        # --- ЛОГИКА: ОБНОВЛЕНИЕ УРОКА ---
        elif action == "UPDATE_LESSON":
            old = details.oldData
            new = details.newData
            
            if old and new:
                changes = []
                # Формируем список того, что изменилось
                if old.subject != new.subject:
                    changes.append(f"📖 Предмет: <s>{old.subject}</s> ➝ <b>{new.subject}</b>")
                if old.room != new.room:
                    changes.append(f"🚪 Кабинет: <s>{old.room}</s> ➝ <b>{new.room}</b>")
                if old.teacher != new.teacher:
                    changes.append(f"👨‍🏫 Препод: <s>{old.teacher}</s> ➝ <b>{new.teacher}</b>")
                if old.type != new.type:
                    changes.append(f"📌 Тип: <s>{old.type}</s> ➝ <b>{new.type}</b>")

                # Если реально что-то поменялось
                if changes:
                    text = (
                        f"✏️ <b>Изменение в расписании!</b>\n"
                        f"Группа: {group}\n"
                        f"📅 День: {day}, Пара №{lesson_num}\n\n"
                        + "\n".join(changes)
                    )

        # 5. Рассылка сообщения (если текст сформирован)
        if text:
            send_count = 0
            for user in users:
                try:
                    await bot.send_message(chat_id=user.user_id, text=text, parse_mode="HTML")
                    send_count += 1
                except Exception as e:
                    # Логируем, но не останавливаем цикл
                    logging.error(f"Не удалось отправить юзеру {user.user_id}: {e}")
            
            logging.info(f"Уведомление '{action}' отправлено {send_count} студентам группы {group}")

        processed_count += 1

    # 6. Обновляем метку времени
    # Берем timestamp самого последнего обработанного события
    if new_entries:
        last_processed_time = new_entries[-1].timestamp
        await save_last_check_time(last_processed_time)
        logging.info(f"Состояние обновлено. Новая метка времени: {last_processed_time}")