"""
Veritabanını gerçekçi Türkçe market ürünleriyle dolduran seed scripti.
Çalıştırma: python seed_products.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

PRODUCTS = [
    # ── Meyve & Sebze ──────────────────────────────────────────
    {"name": "Elma (1 kg)", "price": 24.90, "stock": 200, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400", "unit": "kg"},
    {"name": "Muz (1 kg)", "price": 34.90, "stock": 150, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400", "unit": "kg"},
    {"name": "Domates (1 kg)", "price": 19.90, "stock": 300, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1546470427-e26264be0b11?w=400", "unit": "kg"},
    {"name": "Salatalık (1 kg)", "price": 15.90, "stock": 200, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400", "unit": "kg"},
    {"name": "Biber (500 g)", "price": 12.90, "stock": 150, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400", "unit": "adet"},
    {"name": "Ispanak (500 g)", "price": 18.50, "stock": 100, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", "unit": "adet"},
    {"name": "Portakal (1 kg)", "price": 22.90, "stock": 180, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1547514701-42782101795e?w=400", "unit": "kg"},
    {"name": "Soğan (1 kg)", "price": 8.90, "stock": 400, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?w=400", "unit": "kg"},
    {"name": "Patates (2 kg)", "price": 17.90, "stock": 350, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400", "unit": "kg"},
    {"name": "Limon (500 g)", "price": 13.90, "stock": 120, "category": "meyve_sebze",
     "image_url": "https://images.unsplash.com/photo-1582476261934-3bfe4e9e56c6?w=400", "unit": "adet"},

    # ── Et & Tavuk ─────────────────────────────────────────────
    {"name": "Tavuk Göğsü (1 kg)", "price": 119.90, "stock": 80, "category": "et_tavuk",
     "image_url": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400", "unit": "kg"},
    {"name": "Dana Kıyma (500 g)", "price": 149.90, "stock": 60, "category": "et_tavuk",
     "image_url": "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400", "unit": "adet"},
    {"name": "Tavuk But (1 kg)", "price": 89.90, "stock": 100, "category": "et_tavuk",
     "image_url": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400", "unit": "kg"},
    {"name": "Sucuk (200 g)", "price": 64.90, "stock": 90, "category": "et_tavuk",
     "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400", "unit": "adet"},
    {"name": "Sosis (300 g)", "price": 44.90, "stock": 110, "category": "et_tavuk",
     "image_url": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400", "unit": "adet"},

    # ── Süt Ürünleri ───────────────────────────────────────────
    {"name": "Süt 1 L (Tam Yağlı)", "price": 28.90, "stock": 200, "category": "sut",
     "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", "unit": "adet"},
    {"name": "Yoğurt (1 kg)", "price": 34.90, "stock": 150, "category": "sut",
     "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400", "unit": "adet"},
    {"name": "Beyaz Peynir (400 g)", "price": 74.90, "stock": 80, "category": "sut",
     "image_url": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400", "unit": "adet"},
    {"name": "Kaşar Peyniri (200 g)", "price": 64.90, "stock": 70, "category": "sut",
     "image_url": "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400", "unit": "adet"},
    {"name": "Tereyağı (250 g)", "price": 84.90, "stock": 60, "category": "sut",
     "image_url": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400", "unit": "adet"},
    {"name": "Yumurta (10'lu)", "price": 49.90, "stock": 200, "category": "sut",
     "image_url": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400", "unit": "adet"},
    {"name": "Krema (200 ml)", "price": 29.90, "stock": 50, "category": "sut",
     "image_url": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400", "unit": "adet"},

    # ── Fırın ──────────────────────────────────────────────────
    {"name": "Ekmek (Yarım somun)", "price": 8.50, "stock": 500, "category": "firin",
     "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", "unit": "adet"},
    {"name": "Tam Buğday Ekmeği", "price": 14.90, "stock": 100, "category": "firin",
     "image_url": "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400", "unit": "adet"},
    {"name": "Simit", "price": 6.00, "stock": 300, "category": "firin",
     "image_url": "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400", "unit": "adet"},
    {"name": "Pide (Büyük)", "price": 18.90, "stock": 80, "category": "firin",
     "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400", "unit": "adet"},
    {"name": "Pasta Unu (1 kg)", "price": 22.90, "stock": 120, "category": "firin",
     "image_url": "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400", "unit": "adet"},

    # ── İçecek ─────────────────────────────────────────────────
    {"name": "Su (1.5 L)", "price": 9.90, "stock": 500, "category": "icecek",
     "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400", "unit": "adet"},
    {"name": "Çay (500 g Rize)", "price": 129.90, "stock": 100, "category": "icecek",
     "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400", "unit": "adet"},
    {"name": "Türk Kahvesi (100 g)", "price": 74.90, "stock": 80, "category": "icecek",
     "image_url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400", "unit": "adet"},
    {"name": "Portakal Suyu (1 L)", "price": 39.90, "stock": 120, "category": "icecek",
     "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400", "unit": "adet"},
    {"name": "Kola (1.5 L)", "price": 34.90, "stock": 200, "category": "icecek",
     "image_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400", "unit": "adet"},
    {"name": "Ayran (500 ml)", "price": 14.90, "stock": 150, "category": "icecek",
     "image_url": "https://images.unsplash.com/photo-1571167530149-c1105da4c2ad?w=400", "unit": "adet"},

    # ── Dondurulmuş ────────────────────────────────────────────
    {"name": "Dondurulmuş Bezelye (500 g)", "price": 24.90, "stock": 80, "category": "dondurulmus",
     "image_url": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400", "unit": "adet"},
    {"name": "Dondurulmuş Havuç (500 g)", "price": 19.90, "stock": 90, "category": "dondurulmus",
     "image_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400", "unit": "adet"},
    {"name": "Balık Fileto (500 g)", "price": 129.90, "stock": 40, "category": "dondurulmus",
     "image_url": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400", "unit": "adet"},
    {"name": "Karışık Sebze (1 kg)", "price": 34.90, "stock": 70, "category": "dondurulmus",
     "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400", "unit": "adet"},
    {"name": "Börek (600 g)", "price": 59.90, "stock": 50, "category": "dondurulmus",
     "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400", "unit": "adet"},
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.online_market
    collection = db.products

    existing = await collection.count_documents({})
    if existing > 0:
        print(f"[!] Veritabaninda zaten {existing} urun var.")
        answer = input("Tumunu silip yeniden eklemek ister misiniz? (e/h): ").strip().lower()
        if answer == 'e':
            await collection.delete_many({})
            print("[OK] Eski urunler silindi.")
        else:
            print("Islem iptal edildi.")
            client.close()
            return

    result = await collection.insert_many(PRODUCTS)
    print(f"[OK] {len(result.inserted_ids)} urun basariyla eklendi!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
