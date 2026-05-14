from core.settings import MONGO_URL, FIREBASE_CREDENTIALS, FIREBASE_API_KEY
from fastapi import FastAPI
from api.user import router as user_router
from api.product import router as product_router
from core.firebase_login import *
from api.recipe import router as recipe_router
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials

# Firebase başlatma - sadece henüz başlatılmamışsa
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://marketonline44-default-rtdb.firebaseio.com"
        })
        print("✅ Firebase başarıyla başlatıldı (kontrol.py)")
    else:
        print("ℹ️ Firebase zaten başlatılmış")
except Exception as e:
    print(f"❌ Firebase başlatma hatası (kontrol.py): {str(e)}")
    raise e

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Her yerden istek kabul et (geliştirme aşaması için)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 📌 Kullanıcı ve ürün API'lerini buraya ekliyoruz
app.include_router(user_router, prefix="/api/auth", tags=["Kullanıcı İşlemleri"])
app.include_router(product_router, prefix="/api/products", tags=["Ürün İşlemleri"])
app.include_router(recipe_router, prefix="/api/recipes", tags=["Tarif Önerisi"])


@app.get("/")
def home():
    return {"message": "FastAPI çalışıyor! 🎉"}
