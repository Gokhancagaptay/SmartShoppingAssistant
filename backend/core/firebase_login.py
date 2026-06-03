import firebase_admin
from firebase_admin import credentials
import os
import requests
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# Firebase Admin SDK Başlatma
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS")
print(f"Firebase Credentials Path: {FIREBASE_CREDENTIALS}")  # Debug için

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred, {
            "databaseURL": os.getenv("FIREBASE_DATABASE_URL")
        })
        print("✅ Firebase başarıyla başlatıldı")
    else:
        print("ℹ️ Firebase zaten başlatılmış")
except Exception as e:
    print(f"❌ Firebase başlatma hatası: {str(e)}")
    raise e

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
EMAIL = os.getenv("email")
PASSWORD = os.getenv("password")

def get_new_token():
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": EMAIL,
        "password": PASSWORD,
        "returnSecureToken": True
    }
    response = requests.post(url, json=payload)
    data = response.json()

    if "idToken" in data:
        print("✅ Yeni ID Token alındı.")
        return data["idToken"]
    else:
        print("❌ Hata:", data)
        return None

# Yeni token almak için çağırılabilir
if __name__ == "__main__":
    get_new_token()
