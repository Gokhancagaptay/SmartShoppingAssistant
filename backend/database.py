from motor.motor_asyncio import AsyncIOMotorClient
from core.settings import MONGO_URL
from models.user import User, Address, StockItem
from bson import ObjectId
from firebase_admin import db as firebase_db
from typing import Dict, Optional
import logging

# MongoDB bağlantısı
client = AsyncIOMotorClient(MONGO_URL)
mongo_db = client.online_market
users_collection = mongo_db.users
products_collection = mongo_db.products
reviews_collection = mongo_db.reviews
payment_intents_collection = mongo_db.payment_intents

# Logging ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_user_by_email(email: str):
    return await users_collection.find_one({"email": email})

async def create_user(user_data: dict):
    user = User(**user_data)
    result = await users_collection.insert_one(user.dict())
    return result.inserted_id

async def add_address(email: str, address: Address):
    result = await users_collection.update_one(
        {"email": email},
        {"$push": {"addresses": address.dict()}}
    )
    return result.modified_count > 0

async def get_addresses(email: str):
    user = await users_collection.find_one({"email": email})
    return user.get("addresses", []) if user else []

async def add_stock_item(uid: str, stock_item: StockItem, by_uid: bool = False) -> bool:
    try:
        logger.info(f"Stok ekleme işlemi başladı - UID: {uid}, Ürün: {stock_item.product_id}")
        
        # Firebase referansını al
        ref = firebase_db.reference(f"users/{uid}/stock_items")
        
        try:
            # Mevcut stok verilerini al
            current_stocks = ref.get() or {}
            
            # Ürün zaten var mı kontrol et
            if stock_item.product_id in current_stocks:
                # Varsa miktarı güncelle
                current_quantity = current_stocks[stock_item.product_id].get("quantity", 0)
                new_quantity = current_quantity + stock_item.quantity
                ref.child(stock_item.product_id).update({"quantity": new_quantity})
                logger.info(f"Stok miktarı güncellendi - Yeni miktar: {new_quantity}")
            else:
                # Yoksa yeni ürün olarak ekle
                ref.child(stock_item.product_id).set(stock_item.dict())
                logger.info("Yeni stok ürünü eklendi")
            
            return True
            
        except Exception as e:
            logger.error(f"Firebase stok ekleme hatası: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Stok ekleme işlemi başarısız: {str(e)}")
        return False

async def get_stock_items(uid: str, by_uid: bool = False) -> Dict:
    try:
        logger.info(f"Stok getirme işlemi başladı - UID: {uid}")
        
        if not uid:
            logger.error("UID parametresi boş!")
            return {}
        
        # Firebase referansını al
        ref = firebase_db.reference(f"users/{uid}/stock_items")
        
        try:
            # Stok verilerini getir
            stock_items = ref.get()
            
            if not stock_items:
                logger.info(f"Kullanıcı {uid} için stok bulunamadı")
                return {}
                
            logger.info(f"Stok verileri başarıyla getirildi - Ürün sayısı: {len(stock_items)}")
            return stock_items
            
        except Exception as e:
            logger.error(f"Firebase'den stok getirme hatası: {str(e)}")
            return {}
            
    except Exception as e:
        logger.error(f"Stok getirme işlemi başarısız: {str(e)}")
        return {}

async def update_stock_item(uid: str, product_id: str, quantity: int, by_uid: bool = False) -> bool:
    try:
        logger.info(f"Stok güncelleme işlemi başladı - UID: {uid}, Ürün: {product_id}")
        
        # Firebase referansını al
        ref = firebase_db.reference(f"users/{uid}/stock_items/{product_id}")
        
        try:
            # Stok miktarını güncelle
            ref.update({"quantity": quantity})
            logger.info(f"Stok miktarı güncellendi - Yeni miktar: {quantity}")
            return True
            
        except Exception as e:
            logger.error(f"Firebase stok güncelleme hatası: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Stok güncelleme işlemi başarısız: {str(e)}")
        return False

async def delete_stock_item(uid: str, product_id: str, by_uid: bool = False) -> bool:
    try:
        logger.info(f"Stok silme işlemi başladı - UID: {uid}, Ürün: {product_id}")
        
        # Firebase referansını al
        ref = firebase_db.reference(f"users/{uid}/stock_items/{product_id}")
        
        try:
            # Stok ürününü sil
            ref.delete()
            logger.info("Stok başarıyla silindi")
            return True
            
        except Exception as e:
            logger.error(f"Firebase stok silme hatası: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Stok silme işlemi başarısız: {str(e)}")
        return False

async def get_user_by_uid(uid: str):
    return await users_collection.find_one({"uid": uid})

async def create_user_from_firebase(uid: str) -> Optional[dict]:
    try:
        logger.info(f"Firebase'den kullanıcı verisi çekiliyor - UID: {uid}")
        
        # Firebase referansını al
        ref = firebase_db.reference(f"users/{uid}")
        user_data = ref.get()
        
        if not user_data:
            logger.warning(f"Firebase'de kullanıcı bulunamadı - UID: {uid}")
            return None
            
        user_doc = {
            "uid": uid,
            "email": user_data.get("email", ""),
            "name": user_data.get("name", ""),
            "surname": user_data.get("surname", ""),
            "phone": user_data.get("phone", ""),
            "role": user_data.get("role", "user"),
            "addresses": [],
            "stock_items": []
        }
        
        await users_collection.insert_one(user_doc)
        logger.info(f"Kullanıcı MongoDB'ye kaydedildi - UID: {uid}")
        return user_doc
        
    except Exception as e:
        logger.error(f"Kullanıcı oluşturma hatası: {str(e)}")
        return None
