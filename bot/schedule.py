from datetime import datetime, timedelta
import logging

async def check_and_send_notifications():
    logging.info("scheduled event doing some work")
    # # Настройте время уведомления: за 15 минут до начала
    # NOTIFY_TIMEDELTA = timedelta(minutes=15)
    
    # now = datetime.now()
    # # Ищем события в интервале: (сейчас) < start_time <= (сейчас + 15 мин)
    # # И которые еще НЕ были отправлены (is_notified=False)
    # target_time = now + NOTIFY_TIMEDELTA

    

    # for event in events:
    #     text = (
    #         f"🔔 <b>Напоминание!</b>\n\n"
    #         f"📌 Мероприятие: <b>{event.title}</b>\n"
    #         f"🕒 Начало: {event.start_time.strftime('%d.%m %H:%M')}\n"
    #         f"⏳ Осталось менее 15 минут!"
    #     )
    #     sent_count = 0

    #     for user in users:
    #         try:
    #             await bot.send_message(user.user_id, text, parse_mode="HTML")
    #             sent_count += 1
    #         except Exception as e:
    #             # Пользователь мог заблокировать бота
    #             logging.error(f"Не удалось отправить {user.user_id}: {e}")
        
    #     logging.info(f"Уведомление о '{event.title}' отправлено {sent_count} пользователям.")
        
    #     # 4. Помечаем событие как отправленное
    #     event.is_notified = True