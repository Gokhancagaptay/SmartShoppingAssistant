import os
import logging
from dotenv import load_dotenv

# Çalışma dizininden yukarıya doğru .env dosyasını ara (uvicorn backend/ içinden çalışır)
load_dotenv()

logger = logging.getLogger(__name__)

# --- Uygulama ayarları (tamamı .env üzerinden okunur) ---
MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# firebase.json backend/ klasöründe bulunur; settings.py ise backend/core/ içinde
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIREBASE_CREDENTIALS: str = os.path.join(_backend_dir, "firebase.json")
FIREBASE_API_KEY: str = os.getenv("FIREBASE_API_KEY", "")
EMAIL: str = os.getenv("EMAIL", "")
PASSWORD: str = os.getenv("PASSWORD", "")

# GEMINI_API_KEY artık .env dosyasından okunuyor; kodda düz metin olarak tutmayın.
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# --- Başlangıç doğrulaması ---
_required = {
    "MONGO_URL": MONGO_URL,
    "FIREBASE_API_KEY": FIREBASE_API_KEY,
    "GEMINI_API_KEY": GEMINI_API_KEY,
}

_missing = [k for k, v in _required.items() if not v]
if _missing:
    logger.warning("Eksik çevresel değişkenler: %s", ", ".join(_missing))
else:
    logger.info("Tüm gerekli çevresel değişkenler yüklendi.")


def parse_cors_settings() -> tuple[list[str], bool]:
    """
    CORS_ORIGINS: virgülle ayrılmış origin listesi veya tek '*' .
    '*' ile allow_credentials=True tarayıcı kurallarıyla uyumsuz olabileceği için credentials kapatılır.
    """
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*":
        return ["*"], False
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if not origins:
        return ["*"], False
    return origins, True
