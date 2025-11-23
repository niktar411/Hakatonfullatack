import os
from dotenv import load_dotenv


env_get = os.environ.get
load_dotenv()

BOT_TOKEN = env_get("BOT_TOKEN")
DEBUG = bool(env_get("DEBUG"))
DB_URL = env_get("DB_URL")
BASE_URL = env_get("BASE_URL")
STATE_FILE = env_get("STATE_FILE")