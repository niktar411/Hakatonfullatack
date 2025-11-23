import json
import aiofiles
import logging
from datetime import datetime, timezone
from config import STATE_FILE


async def get_last_check_time() -> datetime:
    try:
        async with aiofiles.open(STATE_FILE, mode='r') as f:
            content = await f.read()
            if not content:
                return datetime.now(timezone.utc)
            
            data = json.loads(content)
            # Превращаем строку обратно в datetime
            last_check = datetime.fromisoformat(data["last_check"])
            return last_check
    except FileNotFoundError:
        # Если файла нет (первый запуск), возвращаем текущее время,
        # чтобы не спамить старыми уведомлениями
        logging.info("Файл состояния не найден. Создаем новый отсчет.")
        return datetime.now(timezone.utc)
    except Exception as e:
        logging.error(f"Ошибка чтения состояния: {e}")
        return datetime.now(timezone.utc)

async def save_last_check_time(dt: datetime):
    """Сохраняет время в файл."""
    try:
        async with aiofiles.open(STATE_FILE, mode='w') as f:
            # Сохраняем в формате ISO (строка)
            data = {"last_check": dt.isoformat()}
            await f.write(json.dumps(data))
    except Exception as e:
        logging.error(f"Не удалось сохранить состояние: {e}")