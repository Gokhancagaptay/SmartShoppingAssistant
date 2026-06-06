import requests
import math
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth, credentials, firestore, initialize_app
from pydantic import BaseModel
from typing import List, Optional
from core.settings import FIREBASE_API_KEY
from firebase_admin import db
from models.user import Address, StockItem, User
from database import (
    get_user_by_email, add_address, get_addresses,
    add_stock_item, get_stock_items, update_stock_item,
    delete_stock_item, create_user,
    get_user_by_uid, create_user_from_firebase,
    products_collection,
)

router = APIRouter(tags=["auth"])
security = HTTPBearer()


def _verify_id_token(token: str) -> dict:
    """Docker container saat kaymasına (clock skew) karşı 1 saniyelik retry."""
    import time
    try:
        return auth.verify_id_token(token)
    except auth.InvalidIdTokenError as e:
        if 'too early' in str(e):
            time.sleep(1)
            return auth.verify_id_token(token)
        raise


def _decode_uid_or_401(credentials: HTTPAuthorizationCredentials, path_user_id: str) -> dict:
    """Bearer JWT doğrular; hatalarda 401 (RTDB öncesi 500 dönmesin)."""
    try:
        decoded = _verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Geçersiz veya süresi dolmuş oturum. Lütfen yeniden giriş yapın.",
        )
    if decoded.get("uid") != path_user_id:
        raise HTTPException(status_code=403, detail="Yetki hatası")
    return decoded


def _normalize_dietary_prefs(data) -> dict:
    """RTDB'den gelen diyet tercihlerini sabit şemaya çevirir."""
    if not data:
        return {"tags": [], "custom_note": ""}
    if not isinstance(data, dict):
        return {"tags": [], "custom_note": ""}
    raw_tags = data.get("tags", [])
    if isinstance(raw_tags, str):
        tags = [raw_tags.strip()] if raw_tags.strip() else []
    elif isinstance(raw_tags, dict):
        tags = [str(v) for v in raw_tags.values() if v is not None and str(v).strip()]
    elif isinstance(raw_tags, list):
        tags = [str(t).strip() for t in raw_tags if t is not None and str(t).strip()]
    else:
        tags = []
    note = data.get("custom_note", "")
    if note is None:
        note = ""
    elif not isinstance(note, str):
        note = str(note)
    return {"tags": tags, "custom_note": note}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = _verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"[AUTH ERROR] {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail=f"Geçersiz token: {type(e).__name__}")


class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    surname: str
    phone: str
    role: str = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class AddressModel(BaseModel):
    title: str
    mahalle: str
    sokak: str
    binaNo: str
    kat: str
    daireNo: str
    tarif: str
    isDefault: bool = False

class UserUpdate(BaseModel):
    name: str
    surname: str
    phone: str
    email: str
    new_password: str = None
    current_password: str = None

# 🔹 Kullanıcı kayıt işlemi
# Frontend Firebase SDK ile kullanıcıyı oluşturur, bu endpoint sadece profil verisini kaydeder.
@router.post("/register", summary="Kullanıcı Kaydı", description="Firebase ile oluşturulan kullanıcının profil bilgilerini kaydeder.")
async def register(user: UserRegister, credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Token'ı doğrulayarak UID'yi al (kullanıcı frontend'de zaten oluşturuldu)
    try:
        decoded_token = _verify_id_token(credentials.credentials)
        user_id = decoded_token["uid"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Geçersiz token: {str(e)}")

    # Kullanıcıya rol ata
    try:
        auth.set_custom_user_claims(user_id, {"role": user.role})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Rol ataması hatası: {str(e)}")

    # Profil bilgilerini Realtime Database'e kaydet
    try:
        db.reference(f"users/{user_id}").set({
            "name": user.name,
            "surname": user.surname,
            "phone": user.phone,
            "email": user.email,
            "role": user.role
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı yazım hatası: {str(e)}")

    return {"message": "Kullanıcı profili başarıyla kaydedildi!", "uid": user_id}

# 🔹 Kullanıcı giriş işlemi
@router.post("/login", summary="Kullanıcı Girişi", description="Mevcut bir kullanıcı için giriş yapar.")
async def login(user: UserLogin):
    try:
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
        payload = {"email": user.email, "password": user.password, "returnSecureToken": True}
        
        print(f"🔑 Giriş denemesi - Email: {user.email}")
        response = requests.post(url, json=payload)
        data = response.json()
        
        if "idToken" in data:
            print(f"✅ Giriş başarılı - Email: {user.email}")
            user_id = data["localId"]
            
            # Firebase Realtime Database'den kullanıcı rolünü oku
            user_role = "user" # Varsayılan rol
            try:
                role_snapshot = db.reference(f"users/{user_id}/role").get()
                if role_snapshot:
                    user_role = role_snapshot
                print(f"👤 Kullanıcı rolü Firebase'den okundu: {user_role} (UID: {user_id})")
            except Exception as e:
                print(f"⚠️ Firebase'den rol okuma hatası: {str(e)} - Varsayılan rol \'user\' kullanılacak.")
                # Hata durumunda logla ama devam et, varsayılan rol kullanılsın.

            return {
                "message": "Giriş başarılı!",
                "idToken": data["idToken"],
                "uid": user_id,
                "role": user_role # Okunan rolü yanıta ekle
            }
        else:
            error_message = data.get("error", {}).get("message", "Bilinmeyen giriş hatası!")
            print(f"❌ Giriş başarısız - Email: {user.email}, Hata: {error_message}")
            raise HTTPException(
                status_code=400,
                detail=error_message
            )
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Ağ hatası (Firebase Authentication): {str(e)}")
        raise HTTPException(status_code=503, detail=f"Kimlik doğrulama servisine ulaşılamıyor: {str(e)}")
    except Exception as e:
        print(f"❌ Beklenmeyen giriş hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Giriş sırasında beklenmeyen bir hata oluştu: {str(e)}")

# 🔹 Token doğrulama
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = _verify_id_token(token)
        user_id = decoded_token.get("uid")

        if not user_id:
            raise HTTPException(status_code=401, detail="Geçersiz token: uid bulunamadı")

        user_data = db.reference(f"users/{user_id}").get()

        if not user_data:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

        user_data["uid"] = user_id
        role = user_data.get("role", "user")

        return user_data, role

    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except auth.RevokedIdTokenError:
        raise HTTPException(status_code=401, detail="Token iptal edilmiş")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Yetkilendirme başarısız: {str(e)}")

# 🔹 Kullanıcı bilgilerini getirme
@router.get("/me", summary="Kullanıcı Bilgilerini Getir")
async def get_user_info(current_user: dict = Depends(get_current_user)):
    try:
        uid = current_user["uid"]
        user_data = db.reference(f"users/{uid}").get() or {}
        role = user_data.get("role", "user")
        print(f"[ME] uid={uid} rtdb_role={role} rtdb_keys={list(user_data.keys())}")
        return {
            "email": current_user.get("email"),
            "name": user_data.get("name"),
            "surname": user_data.get("surname"),
            "phone": user_data.get("phone"),
            "role": role
        }
    except Exception as e:
        print(f"Kullanıcı bilgileri alma hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Kullanıcı bilgileri alınamadı: {str(e)}")

# 🔹 Kullanıcı profil güncelleme
@router.put("/update", summary="Kullanıcı Profilini Güncelle")
async def update_profile(user_data: UserUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = _verify_id_token(token)
        user_id = decoded_token.get("uid")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Kullanıcı kimliği bulunamadı")
            
        print(f"👤 Profil güncelleme - User ID: {user_id}")
        
        # Firebase'de kullanıcı verileri güncelleme
        user_ref = db.reference(f"users/{user_id}")
        
        # Güncelleme verilerini hazırla
        update_data = {
            "name": user_data.name,
            "surname": user_data.surname,
            "phone": user_data.phone,
            "email": user_data.email
        }
        
        # Firebase Authentication'da e-posta güncelleme (eğer değiştiyse)
        current_user_data = db.reference(f"users/{user_id}").get() or {}
        if user_data.email != current_user_data.get("email"):
            try:
                auth.update_user(user_id, email=user_data.email)
                print(f"✅ Firebase Auth email güncellendi: {user_data.email}")
            except Exception as e:
                print(f"❌ Firebase Auth email güncelleme hatası: {str(e)}")
                raise HTTPException(status_code=400, detail=f"E-posta güncellenemedi: {str(e)}")
        
        # Şifre güncellemesi istendiyse
        if user_data.current_password and user_data.new_password:
            try:
                # Email/password ile yeniden kimlik doğrulama yapmak gerekir
                # Bu örnek basitleştirilmiş, gerçek uygulamada daha güvenli yöntem kullanılmalı
                url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
                payload = {
                    "email": user_data.email, 
                    "password": user_data.current_password, 
                    "returnSecureToken": True
                }
                response = requests.post(url, json=payload)
                
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
                
                # Şifre güncelleme
                auth.update_user(user_id, password=user_data.new_password)
                print("✅ Şifre başarıyla güncellendi")
            except Exception as e:
                print(f"❌ Şifre güncelleme hatası: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Şifre güncellenemedi: {str(e)}")
        
        # Realtime Database'de kullanıcı bilgilerini güncelleme
        user_ref.update(update_data)
        print(f"✅ Firebase kullanıcı bilgileri güncellendi: {update_data}")
        
        return {"message": "Profil başarıyla güncellendi", "user": update_data}
    except Exception as e:
        print(f"❌ Profil güncelleme hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profil güncellenemedi: {str(e)}")

# 🔹 Şifre sıfırlama işlemi
@router.post("/forgot-password", summary="Şifre Sıfırlama", description="Kullanıcının şifresini sıfırlamak için e-posta gönderir.")
def forgot_password(email: str):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={FIREBASE_API_KEY}"
    payload = {"requestType": "PASSWORD_RESET", "email": email}
    response = requests.post(url, json=payload)
    data = response.json()

    if "email" in data:
        return {"message": "Şifre sıfırlama bağlantısı başarıyla gönderildi!"}
    else:
        raise HTTPException(status_code=400, detail=data.get("error", {}).get("message", "Bilinmeyen hata!"))

# 🔹 Admin yetkisini kontrol etme
def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = _verify_id_token(token)
        claims = auth.get_user(decoded_token["uid"]).custom_claims
        if not claims or claims.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok!")
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Yetkilendirme başarısız: {str(e)}")

@router.post("/users/{user_id}/addresses", summary="Adres Ekle")
def add_address(user_id: str, address: AddressModel):
    try:
        ref = db.reference(f"users/{user_id}/addresses").push()
        ref.set(address.dict())
        return {"success": True, "id": ref.key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adres eklenemedi: {str(e)}")

@router.get("/users/{user_id}/addresses", summary="Adresleri Listele")
def list_addresses(user_id: str):
    try:
        ref = db.reference(f"users/{user_id}/addresses")
        data = ref.get()
        if not data:
            return []
        return [{"id": k, **v} for k, v in data.items()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adresler alınamadı: {str(e)}")

@router.delete("/users/{user_id}/addresses/{address_id}", summary="Adresi Sil")
def delete_address(user_id: str, address_id: str):
    try:
        ref = db.reference(f"users/{user_id}/addresses/{address_id}")
        ref.delete()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adres silinemedi: {str(e)}")

@router.post("/users/register")
async def register_user(user: User):
    try:
        # Önce kullanıcının var olup olmadığını kontrol et
        existing_user = await get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
        
        # Kullanıcıyı MongoDB'ye kaydet
        user_id = await create_user(user.dict())
        return {"message": "Kullanıcı başarıyla oluşturuldu", "user_id": str(user_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı kaydı başarısız: {str(e)}")

@router.post("/users/{email}/addresses")
async def create_address(email: str, address: Address, current_user: dict = Depends(get_current_user)):
    try:
        # Kullanıcı kontrolü
        if current_user["email"] != email:
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
        
        # Kullanıcının MongoDB'de var olup olmadığını kontrol et
        user = await get_user_by_email(email)
        if not user:
            # Kullanıcı yoksa otomatik oluştur
            new_user = User(
                email=email,
                name=current_user.get("name", ""),
                surname=current_user.get("surname", ""),
                phone=current_user.get("phone", ""),
                role="user"
            )
            await create_user(new_user.dict())
        
        # Adresi ekle
        success = await add_address(email, address)
        if not success:
            raise HTTPException(status_code=500, detail="Adres eklenemedi")
        return {"message": "Adres başarıyla eklendi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İşlem başarısız: {str(e)}")

@router.get("/users/{email}/addresses")
async def list_addresses(email: str, current_user: dict = Depends(get_current_user)):
    try:
        # Kullanıcı kontrolü
        if current_user["email"] != email:
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
        
        # Kullanıcının MongoDB'de var olup olmadığını kontrol et
        user = await get_user_by_email(email)
        if not user:
            return []  # Kullanıcı yoksa boş liste dön
        
        addresses = await get_addresses(email)
        return addresses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İşlem başarısız: {str(e)}")

@router.post("/users/{user_id}/stock")
def add_stock(user_id: str, stock_item: StockItem, current_user: dict = Depends(get_current_user)):
    if current_user["uid"] != user_id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    try:
        # Firebase Realtime Database'e ekle
        ref = db.reference(f"users/{user_id}/stock_items")
        # Ürün ID'si ile kaydet (aynı ürün tekrar eklenirse üzerine yazar)
        ref.child(stock_item.product_id).set(stock_item.dict())
        return {"message": "Stok başarıyla eklendi (Firebase)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stok eklenemedi: {str(e)}")

@router.get("/users/{user_id}/stock")
def list_stock(user_id: str, current_user: dict = Depends(get_current_user)):
    print(f"Stok isteği - User ID: {user_id}") # Debug için
    print(f"Current User: {current_user}") # Debug için
    
    if current_user["uid"] != user_id:
        print("Yetki hatası - Kullanıcı ID'leri eşleşmiyor") # Debug için
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    try:
        ref = db.reference(f"users/{user_id}/stock_items")
        data = ref.get()
        print(f"Firebase'den gelen veri: {data}") # Debug için
        
        if not data:
            print("Firebase'den veri gelmedi") # Debug için
            return []
        return [{"product_id": k, **v} for k, v in data.items()]
    except Exception as e:
        print(f"Stok getirme hatası: {str(e)}") # Debug için
        raise HTTPException(status_code=500, detail=f"Stoklar alınamadı: {str(e)}")

@router.put("/users/{user_id}/stock/{product_id}")
def update_stock(user_id: str, product_id: str, quantity: int, current_user: dict = Depends(get_current_user)):
    if current_user["uid"] != user_id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    try:
        ref = db.reference(f"users/{user_id}/stock_items/{product_id}")
        ref.update({"quantity": quantity})
        return {"message": "Stok başarıyla güncellendi (Firebase)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stok güncellenemedi: {str(e)}")

@router.delete("/users/{user_id}/stock/{product_id}")
def delete_stock(user_id: str, product_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["uid"] != user_id:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    try:
        # Firebase Realtime Database'den sil
        ref = db.reference(f"users/{user_id}/stock_items/{product_id}")
        ref.delete()
        return {"message": "Stok başarıyla silindi (Firebase)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stok silinemedi: {str(e)}")

@router.delete("/delete-account", summary="Hesabı Kalıcı Olarak Sil")
async def delete_account(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = _verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Kullanıcı kimliği bulunamadı")

        # RTDB'den kullanıcı verisini sil
        db.reference(f"users/{uid}").delete()

        # Firebase Auth'dan kullanıcıyı sil
        auth.delete_user(uid)

        return {"message": "Hesap başarıyla silindi"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hesap silinemedi: {str(e)}")


# Duplicate the endpoint to handle both old and new paths
@router.put("/auth/update", summary="Kullanıcı Profilini Güncelle (Eski Yol)")
async def update_profile_old_path(user_data: UserUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    return await update_profile(user_data, credentials)


# ─── Sipariş Modelleri ───────────────────────────────────────────────────────

class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int
    category: str = ""
    image_url: str = ""
    unit: str = ""

class OrderAddress(BaseModel):
    title: str = ""
    fullName: str = ""
    phone: str = ""
    city: str = ""
    district: str = ""
    detail: str = ""

class CreateOrderRequest(BaseModel):
    address: OrderAddress
    payment_method: str = "card"
    items: list[OrderItem] = []
    total_price: float = 0.0


# ─── Sipariş Endpoint'leri ───────────────────────────────────────────────────

@router.post("/orders", summary="Sipariş Oluştur")
async def create_order(
    order_data: CreateOrderRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Sepeti sipariş olarak kaydeder.
    - Firebase'e sipariş + kullanıcı stok güncellemesi yazar.
    - MongoDB'deki ürün stoklarını düşürür.
    """
    import logging
    import uuid
    import asyncio
    from datetime import datetime, timezone
    from database import products_collection
    from bson import ObjectId

    logger = logging.getLogger("order")

    try:
        decoded_token = _verify_id_token(credentials.credentials)
        uid = decoded_token["uid"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Geçersiz token: {str(e)}")

    # Stok yeterlilik kontrolü — sipariş yazmadan önce
    if order_data.items:
        insufficient = []
        for item in order_data.items:
            try:
                product = await products_collection.find_one(
                    {"_id": ObjectId(item.id)}, {"stock": 1, "name": 1}
                )
                if not product:
                    insufficient.append(f"{item.name}: ürün bulunamadı")
                elif product.get("stock", 0) < item.quantity:
                    insufficient.append(
                        f"{item.name}: stokta {product.get('stock', 0)} adet var, {item.quantity} adet istendi"
                    )
            except Exception:
                insufficient.append(f"{item.name}: stok doğrulanamadı")
        if insufficient:
            raise HTTPException(
                status_code=400,
                detail="Yetersiz stok: " + "; ".join(insufficient)
            )

    order_id = f"ORD-{uuid.uuid4().hex[:10].upper()}"
    order_doc = {
        "order_id": order_id,
        "uid": uid,
        "items": [item.dict() for item in order_data.items],
        "address": order_data.address.dict(),
        "payment_method": order_data.payment_method,
        "total_price": order_data.total_price,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        await asyncio.to_thread(db.reference(f"users/{uid}/orders/{order_id}").set, order_doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sipariş kaydedilemedi: {str(e)}")

    # ── Kullanıcı stoğunu güncelle (Firebase) ─────────────────────────────────
    print(f"[ORDER] Stok guncellenecek urun sayisi: {len(order_data.items)}")

    def _update_user_stock():
        """Firebase senkron işlemlerini ayrı thread'de çalıştır."""
        for item in order_data.items:
            try:
                print(f"[STOCK] Isleniyor: {item.name} (id={item.id}) x{item.quantity}")
                # Firebase key'inde kullanılamayan karakterleri temizle
                safe_key = item.id.replace(".", "_").replace("#", "_").replace("$", "_").replace("[", "_").replace("]", "_").replace("/", "_")
                stock_ref = db.reference(f"users/{uid}/stock_items/{safe_key}")
                existing = stock_ref.get()
                if existing:
                    new_qty = existing.get("quantity", 0) + item.quantity
                    stock_ref.update({"quantity": new_qty})
                    print(f"[STOCK] Guncellendi: {item.name} -> {new_qty}")
                else:
                    stock_ref.set({
                        "product_id": item.id,
                        "name": item.name,
                        "quantity": item.quantity,
                        "category": item.category,
                        "unit": item.unit,
                        "image_url": item.image_url,
                    })
                    print(f"[STOCK] Eklendi: {item.name} x{item.quantity}")
            except Exception as e:
                print(f"[STOCK ERROR] {item.name}: {str(e)}")

    await asyncio.to_thread(_update_user_stock)

    # ── Mağaza stoğunu düşür (MongoDB) ─────────────────────────────────────────
    for item in order_data.items:
        try:
            result = await products_collection.update_one(
                {"_id": ObjectId(item.id), "stock": {"$gte": item.quantity}},
                {"$inc": {"stock": -item.quantity}}
            )
            if result.matched_count == 0:
                logger.warning(f"Stok güncellenemedi (race condition?): {item.name}")
        except Exception as e:
            logger.error(f"Magaza stok dusulemedi [{item.name}]: {str(e)}")

    return {"message": "Sipariş başarıyla oluşturuldu", "order_id": order_id}


@router.get("/orders", summary="Siparişleri Listele")
def list_orders(current_user: dict = Depends(get_current_user)):
    """Giriş yapmış kullanıcının tüm siparişlerini döner."""
    try:
        uid = current_user["uid"]
        ref = db.reference(f"users/{uid}/orders")
        data = ref.get()
        if not data:
            return []
        return list(data.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Siparişler alınamadı: {str(e)}")


# ─── Checkout Adres Modeli & Endpoint'leri ──────────────────────────────────

class CheckoutAddressModel(BaseModel):
    title: str = ""
    fullName: str = ""
    phone: str = ""
    city: str = ""
    district: str = ""
    detail: str = ""


@router.post("/users/{user_id}/saved-addresses", summary="Checkout Adresi Kaydet")
def save_checkout_address(
    user_id: str,
    address: CheckoutAddressModel,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Kullanıcının checkout adresini Firebase'e kaydeder."""
    try:
        decoded_token = _verify_id_token(credentials.credentials)
        if decoded_token["uid"] != user_id:
            raise HTTPException(status_code=403, detail="Yetki hatası")
        ref = db.reference(f"users/{user_id}/saved_addresses").push()
        ref.set(address.dict())
        return {"success": True, "id": ref.key}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adres kaydedilemedi: {str(e)}")


@router.get("/users/{user_id}/saved-addresses", summary="Checkout Adreslerini Listele")
def list_saved_addresses(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Kullanıcının kayıtlı checkout adreslerini döner."""
    try:
        decoded_token = _verify_id_token(credentials.credentials)
        if decoded_token["uid"] != user_id:
            raise HTTPException(status_code=403, detail="Yetki hatası")
        ref = db.reference(f"users/{user_id}/saved_addresses")
        data = ref.get()
        if not data:
            return []
        return [{"id": k, **v} for k, v in data.items()]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adresler alınamadı: {str(e)}")


@router.get("/users/{user_id}/dietary-preferences", summary="Diyet Tercihlerini Getir")
def get_dietary_preferences(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Kullanıcının kayıtlı diyet tercihlerini döner."""
    try:
        _decode_uid_or_401(credentials, user_id)
        ref = db.reference(f"users/{user_id}/dietary_preferences")
        data = ref.get()
        return _normalize_dietary_prefs(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tercihler alınamadı: {str(e)}")


@router.put("/users/{user_id}/dietary-preferences", summary="Diyet Tercihlerini Kaydet")
def save_dietary_preferences(
    user_id: str,
    body: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Kullanıcının diyet tercihlerini Firebase'e kaydeder.
    Body: { "tags": ["vejetaryen", "glütensiz"], "custom_note": "Şeker kullanmıyorum." }
    """
    try:
        _decode_uid_or_401(credentials, user_id)
        ref = db.reference(f"users/{user_id}/dietary_preferences")
        ref.set({
            "tags": body.get("tags", []),
            "custom_note": body.get("custom_note", ""),
        })
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tercihler kaydedilemedi: {str(e)}")


@router.delete("/users/{user_id}/saved-addresses/{address_id}", summary="Kayıtlı Adresi Sil")
def delete_saved_address(
    user_id: str,
    address_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        decoded_token = _verify_id_token(credentials.credentials)
        if decoded_token["uid"] != user_id:
            raise HTTPException(status_code=403, detail="Yetki hatası")
        db.reference(f"users/{user_id}/saved_addresses/{address_id}").delete()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adres silinemedi: {str(e)}")


# ─────────────────────────────────────────────
#  Tarif Stok Düşümü
# ─────────────────────────────────────────────

class RecipeIngredient(BaseModel):
    product_name: str
    quantity: float
    unit: str

class DeductRecipeRequest(BaseModel):
    ingredients: List[RecipeIngredient]
    servings: int = 1  # Kaç kişilik yapıldı


def _name_matches(stock_name: str, ingredient_name: str) -> bool:
    """
    Stok ürünü adı ile tarif malzemesi adının eşleşip eşleşmediğini kontrol eder.
    Büyük/küçük harf farkını ve kısmi eşleşmeyi göz ardı eder.
    """
    s = stock_name.lower().strip()
    i = ingredient_name.lower().strip()
    return i in s or s in i


# Gram/ml cinsinden küçük miktarlar için stok düşülmez (baharat, yağ vb. tek kullanım sayılır)
_UNIT_DEDUCT_ONE = {"gram", "ml", "yemek kaşığı", "çay kaşığı", "tutam", "damla", "dilim", "yaprak"}


@router.post("/users/{user_id}/stock/deduct-recipe", summary="Tarif Stok Düşümü")
async def deduct_recipe_stock(
    user_id: str,
    body: DeductRecipeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Kullanıcının pişirdiği tarife göre stoğundan malzeme düşer.
    - 'adet' birimi: porsiyon * miktar kadar düşülür.
    - Gram/ml/kaşık gibi birimler: her porsiyon için 1 birim düşülür.
    Düşüm sonrası azalan veya biten ürünleri ve mağazada satılanları döner.
    """
    try:
        decoded_token = _verify_id_token(credentials.credentials)
        if decoded_token["uid"] != user_id:
            raise HTTPException(status_code=403, detail="Yetki hatası")

        servings = max(1, body.servings)

        # ── Kullanıcı stoku ──
        stock_ref = db.reference(f"users/{user_id}/stock_items")
        stock: dict = stock_ref.get() or {}

        # ── Mağaza ürünleri (uyarı için ad + resim) ──
        store_cursor = products_collection.find({}, {"name": 1, "image_url": 1, "_id": 0})
        store_products = await store_cursor.to_list(length=500)

        deducted = []       # Başarıyla düşülen ürünler
        low_stock = []      # Azalan ürünler (qty <= 2)
        depleted = []       # Biten ürünler (qty <= 0)
        not_found = []      # Kullanıcı stokunda olmayan ürünler
        buy_suggestions = []  # Mağazadan alınabilecek ürünler

        for ing in body.ingredients:
            # Düşülecek miktar hesapla
            unit_lower = ing.unit.lower().strip()
            if unit_lower == "adet":
                deduct_amount = math.ceil(ing.quantity * servings)
            else:
                # Hacim/ağırlık birimlerinde 1 birim/porsiyon düşülür
                deduct_amount = servings

            # Kullanıcı stokunda eşleşen ürünü bul
            matched_key = None
            matched_item = None
            for key, item in stock.items():
                if isinstance(item, dict) and _name_matches(item.get("name", ""), ing.product_name):
                    matched_key = key
                    matched_item = item
                    break

            if not matched_key:
                not_found.append(ing.product_name)
                # Mağazada var mı kontrol et
                for sp in store_products:
                    if _name_matches(sp.get("name", ""), ing.product_name):
                        buy_suggestions.append({
                            "name": ing.product_name,
                            "store_name": sp["name"],
                            "image_url": sp.get("image_url", ""),
                            "reason": "stokta_yok",
                        })
                        break
                continue

            current_qty = int(matched_item.get("quantity", 0))
            new_qty = current_qty - deduct_amount

            if new_qty <= 0:
                # Stoğu tamamen bitir
                db.reference(f"users/{user_id}/stock_items/{matched_key}").delete()
                depleted.append(ing.product_name)
                # Stoktan kaldı, mağazadan alabilir mi?
                for sp in store_products:
                    if _name_matches(sp.get("name", ""), ing.product_name):
                        buy_suggestions.append({
                            "name": ing.product_name,
                            "store_name": sp["name"],
                            "image_url": sp.get("image_url", ""),
                            "reason": "bitti",
                        })
                        break
            else:
                db.reference(f"users/{user_id}/stock_items/{matched_key}").update({"quantity": new_qty})
                deducted.append({"name": ing.product_name, "new_qty": new_qty})
                if new_qty <= 2:
                    low_stock.append({"name": ing.product_name, "quantity": new_qty})
                    for sp in store_products:
                        if _name_matches(sp.get("name", ""), ing.product_name):
                            buy_suggestions.append({
                                "name": ing.product_name,
                                "store_name": sp["name"],
                                "image_url": sp.get("image_url", ""),
                                "reason": "azaldi",
                                "quantity": new_qty,
                            })
                            break

        return {
            "deducted": deducted,
            "low_stock": low_stock,
            "depleted": depleted,
            "not_found": not_found,
            "buy_suggestions": buy_suggestions,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stok güncellenemedi: {str(e)}")