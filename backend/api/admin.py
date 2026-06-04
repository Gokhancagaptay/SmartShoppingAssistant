from fastapi import APIRouter, HTTPException, Depends, Body
import firebase_admin
from firebase_admin import db, auth
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, validator
from api.user import verify_token

router = APIRouter()


def require_admin(user_data=Depends(verify_token)):
    """Sadece admin rolüne sahip kullanıcılara izin verir."""
    user, role = user_data
    if role != "admin":
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekli.")
    return user_data


# Model for updating user role (admin.py içine taşındı)
class UserRoleUpdate(BaseModel):
    role: str

# Firebase referansının doğru olduğundan emin olun. 
# main.py'de zaten initialize_app çağrıldığı için burada tekrar çağırmaya gerek yok,
# ancak db referansını almak için firebase_admin import edilmeli.

@router.get("/dashboard/stats", summary="Admin Dashboard İstatistikleri")
async def get_dashboard_stats(_: tuple = Depends(require_admin)):
    try:
        orders_ref = db.reference('/orders')
        users_ref = db.reference('/users') # Kullanıcılar için referans eklendi
        
        orders_snapshot = orders_ref.get()
        users_snapshot = users_ref.get() # Kullanıcı verileri çekildi

        total_completed_revenue = 0.0
        active_orders_count = 0
        total_users = 0

        # Siparişleri işle
        if orders_snapshot and isinstance(orders_snapshot, dict):
            for user_id, user_orders in orders_snapshot.items():
                if isinstance(user_orders, dict):
                    for order_id, order_details in user_orders.items():
                        if isinstance(order_details, dict):
                            status = order_details.get('status')
                            total_price_str = str(order_details.get('totalPrice', '0')) 
                            total_price = 0.0
                            try:
                                total_price = float(total_price_str)
                            except ValueError:
                                print(f"Uyarı: order {order_id} için totalPrice ('{total_price_str}') float'a çevrilemedi.")

                            if status == "completed":
                                total_completed_revenue += total_price
                            if status == "active":
                                active_orders_count += 1
        
        # Kullanıcı sayısını hesapla
        if users_snapshot and isinstance(users_snapshot, dict):
            total_users = len(users_snapshot)
        
        return {
            "totalCompletedRevenue": round(total_completed_revenue, 2),
            "activeOrdersCount": active_orders_count,
            "totalUsers": total_users # Kullanıcı sayısı yanıta eklendi
        }

    except Exception as e:
        print(f"Dashboard istatistikleri alınırken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard istatistikleri alınamadı: {str(e)}")

# === Kullanıcı Yönetimi Endpointleri ===

@router.get("/users", summary="Tüm Kullanıcıları Listele")
async def list_users(_: tuple = Depends(require_admin)):
    users_list = []
    try:
        for user_record in auth.list_users().iterate_all():
            user_data = {
                "uid": user_record.uid,
                "email": user_record.email,
                "displayName": user_record.display_name,
                "photoURL": user_record.photo_url,
                "disabled": user_record.disabled,
                "creationTimestamp": user_record.user_metadata.creation_timestamp if user_record.user_metadata else None,
                "lastSignInTimestamp": user_record.user_metadata.last_sign_in_timestamp if user_record.user_metadata else None,
                "role": "user"  # Varsayılan rol
            }
            try:
                rtdb_user_ref = db.reference(f'/users/{user_record.uid}')
                rtdb_user_snapshot = rtdb_user_ref.get()
                if rtdb_user_snapshot and isinstance(rtdb_user_snapshot, dict):
                    user_data['role'] = rtdb_user_snapshot.get('role', 'user')
                    user_data['name'] = rtdb_user_snapshot.get('name', '')
                    user_data['surname'] = rtdb_user_snapshot.get('surname', '')
                    user_data['phone'] = rtdb_user_snapshot.get('phone', '')
            except Exception as e_rtdb:
                print(f"Kullanıcı {user_record.uid} için RTDB verisi okunurken hata: {e_rtdb}")
            users_list.append(user_data)
        return {"users": users_list}
    except Exception as e:
        print(f"Kullanıcılar listelenirken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Kullanıcılar listelenemedi: {str(e)}")

@router.put("/users/{user_id}/role", summary="Kullanıcı Rolünü Güncelle")
async def update_user_role(user_id: str, role_update: UserRoleUpdate = Body(...), _: tuple = Depends(require_admin)):
    try:
        user_ref = db.reference(f'/users/{user_id}')
        user_snapshot = user_ref.get()
        if not user_snapshot:
            raise HTTPException(status_code=404, detail=f"Kullanıcı {user_id} RTDB'de bulunamadı.")

        # RTDB ve Firebase custom claims her ikisini birden güncelle
        user_ref.update({"role": role_update.role})
        auth.set_custom_user_claims(user_id, {"role": role_update.role})
        print(f"Kullanıcı {user_id} rolü {role_update.role} olarak güncellendi (RTDB + custom claims).")
        return {"message": f"Kullanıcı {user_id} rolü başarıyla {role_update.role} olarak güncellendi"}
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail=f"Firebase Auth'da {user_id} ID'li kullanıcı bulunamadı.")
    except Exception as e:
        print(f"Kullanıcı rolü güncellenirken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Kullanıcı rolü güncellenemedi: {str(e)}")

@router.delete("/users/{user_id}", summary="Kullanıcıyı Sil")
async def delete_user_account(user_id: str, _: tuple = Depends(require_admin)):
    try:
        auth.delete_user(user_id)
        print(f"Kullanıcı {user_id} Firebase Auth'dan silindi.")
        try:
            rtdb_user_ref = db.reference(f'/users/{user_id}')
            if rtdb_user_ref.get(): # Sadece varsa silmeyi dene
                 rtdb_user_ref.delete()
                 print(f"Kullanıcı {user_id} RTDB'den silindi.")
            else:
                print(f"Kullanıcı {user_id} RTDB'de bulunamadı, silme işlemi atlandı.")
        except Exception as e_rtdb:
            print(f"Kullanıcı {user_id} için RTDB verisi silinirken hata (kullanıcı Auth'dan silindi): {e_rtdb}")
        return {"message": f"Kullanıcı {user_id} başarıyla silindi"}
    except auth.UserNotFoundError:
        print(f"Silinecek kullanıcı {user_id} Firebase Auth'da bulunamadı.")
        # Auth'da yoksa RTDB'den de silelim (eğer varsa)
        try:
            rtdb_user_ref = db.reference(f'/users/{user_id}')
            if rtdb_user_ref.get():
                rtdb_user_ref.delete()
                print(f"Kullanıcı {user_id} (sadece RTDB'de bulundu) RTDB'den silindi.")
                return {"message": f"Kullanıcı {user_id} (sadece RTDB'de bulundu) başarıyla silindi"}
            else:
                raise HTTPException(status_code=404, detail=f"Kullanıcı {user_id} bulunamadı")
        except Exception as e_rtdb_only:
            print(f"Sadece RTDB'de olan kullanıcı {user_id} silinirken hata: {e_rtdb_only}")
            raise HTTPException(status_code=404, detail=f"Kullanıcı {user_id} bulunamadı veya silinemedi: {str(e_rtdb_only)}")
    except Exception as e:
        print(f"Kullanıcı silinirken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Kullanıcı silinemedi: {str(e)}")

@router.put("/users/{user_id}/disable", summary="Kullanıcıyı Devre Dışı Bırak")
async def disable_user(user_id: str, _: tuple = Depends(require_admin)):
    try:
        auth.update_user(user_id, disabled=True)
        return {"message": f"Kullanıcı {user_id} başarıyla devre dışı bırakıldı."}
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail=f"Kullanıcı {user_id} bulunamadı")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}/enable", summary="Kullanıcıyı Etkinleştir")
async def enable_user(user_id: str, _: tuple = Depends(require_admin)):
    try:
        auth.update_user(user_id, disabled=False)
        return {"message": f"Kullanıcı {user_id} başarıyla etkinleştirildi."}
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail=f"Kullanıcı {user_id} bulunamadı")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === Sipariş Yönetimi Endpointleri ===

class OrderProductDetail(BaseModel):
    id: Optional[str] = None # Bazen id olmayabiliyor eski siparişlerde, imageUrl var
    imageUrl: Optional[str] = None
    name: str
    price: float
    quantity: int
    unit: Optional[str] = None 

class OrderAddressDetail(BaseModel):
    binaNo: Optional[str] = None
    daireNo: Optional[str] = None
    full: Optional[str] = None
    id: Optional[str] = None
    isDefault: Optional[bool] = None # Bazen string "true" gelebiliyor, bool olmalı
    kat: Optional[str] = None
    mahalle: Optional[str] = None
    sokak: Optional[str] = None
    tarif: Optional[str] = None
    title: Optional[str] = None

    @validator('isDefault', pre=True)
    def coerce_isDefault_to_bool(cls, value):
        if isinstance(value, str):
            if value.lower() == 'true':
                return True
            elif value.lower() == 'false':
                return False
        return value # Zaten bool ise veya dönüştürülemiyorsa olduğu gibi bırak

class AdminOrderResponse(BaseModel):
    firebaseOrderId: str             # Firebase'in sipariş için ürettiği key
    customerUserId: str              # Siparişin ait olduğu kullanıcı UID'si
    customerName: Optional[str] = None # Müşteri adı soyadı
    customerEmail: Optional[str] = None# Müşteri email
    orderId: Optional[str] = None      # Bizim verdiğimiz orderId (timestamp bazlı olan)
    orderNumber: Optional[str] = None
    paymentMethod: Optional[str] = None
    products: List[OrderProductDetail]
    rating: Optional[int] = None
    status: Optional[str] = None
    timestamp: Optional[float] = None # Timestamp float veya int olabilir
    totalPrice: Optional[float] = None
    address: Optional[OrderAddressDetail] = None

@router.get("/orders", summary="Tüm Siparişleri Listele (Admin)", response_model=List[AdminOrderResponse])
async def list_all_orders(status: Optional[str] = None, _: tuple = Depends(require_admin)):
    all_orders_list = []
    try:
        orders_root_ref = db.reference('/orders')
        users_root_ref = db.reference('/users')
        
        orders_snapshot = orders_root_ref.get()
        users_snapshot = users_root_ref.get() or {} # Kullanıcılar yoksa boş dict

        if not orders_snapshot or not isinstance(orders_snapshot, dict):
            return []

        for customer_user_id, user_orders in orders_snapshot.items():
            if not isinstance(user_orders, dict):
                continue
            
            customer_info = users_snapshot.get(customer_user_id, {})
            customer_name = f"{customer_info.get('name', '')} {customer_info.get('surname', '')}".strip()
            customer_email = customer_info.get('email', '')

            for firebase_order_id, order_details in user_orders.items():
                if not isinstance(order_details, dict):
                    continue
                
                # Durum filtresi
                if status and order_details.get('status') != status:
                    continue
                
                # Product listesini OrderProductDetail modeline uygun hale getirme
                raw_products = order_details.get('products', [])
                parsed_products = []
                if isinstance(raw_products, list):
                    for prod in raw_products:
                        if isinstance(prod, dict):
                            # Eski siparişlerde product id olmayabilir, kontrol ekle
                            prod_id = prod.get('id') 
                            parsed_products.append(OrderProductDetail(
                                id=str(prod_id) if prod_id else None, # ObjectId ise str'ye çevir, yoksa None
                                imageUrl=prod.get('imageUrl', prod.get('image_url')), # iki farklı key olabiliyor
                                name=prod.get('name', 'Bilinmeyen Ürün'),
                                price=float(prod.get('price', 0.0)),
                                quantity=int(prod.get('quantity', 0)),
                                unit=prod.get('unit')
                            ))
                
                # Adres detaylarını OrderAddressDetail modeline uygun hale getirme
                raw_address = order_details.get('address')
                parsed_address = None
                if isinstance(raw_address, dict):
                    parsed_address = OrderAddressDetail(**raw_address)

                order_data = AdminOrderResponse(
                    firebaseOrderId=firebase_order_id,
                    customerUserId=customer_user_id,
                    customerName=customer_name if customer_name else None,
                    customerEmail=customer_email if customer_email else None,
                    orderId=str(order_details.get('orderId', '')),
                    orderNumber=order_details.get('orderNumber'),
                    paymentMethod=order_details.get('paymentMethod'),
                    products=parsed_products,
                    rating=order_details.get('rating'),
                    status=order_details.get('status'),
                    timestamp=float(order_details.get('timestamp', 0)),
                    totalPrice=float(order_details.get('totalPrice', 0.0)),
                    address=parsed_address
                )
                all_orders_list.append(order_data)
        
        # Siparişleri tarihe göre (en yeniden en eskiye) sırala
        all_orders_list.sort(key=lambda x: x.timestamp if x.timestamp is not None else 0, reverse=True)
        return all_orders_list

    except Exception as e:
        print(f"Tüm siparişler listelenirken hata: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Siparişler listelenemedi: {str(e)}")

@router.put("/orders/{customer_user_id}/{firebase_order_id}/status", summary="Sipariş Durumunu Güncelle (Admin)")
async def update_order_status_admin(
    customer_user_id: str,
    firebase_order_id: str,
    status_update: dict = Body(...),
    _: tuple = Depends(require_admin),
): # Request body'den { "status": "yeni_durum" } bekleniyor
    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Yeni durum (status) değeri body içinde gönderilmelidir.")

    try:
        order_ref = db.reference(f'/orders/{customer_user_id}/{firebase_order_id}')
        if not order_ref.get():
            raise HTTPException(status_code=404, detail=f"Sipariş bulunamadı: {customer_user_id}/{firebase_order_id}")
        
        order_ref.update({"status": new_status})
        print(f"Sipariş durumu güncellendi: {customer_user_id}/{firebase_order_id} -> {new_status}")
        return {"message": "Sipariş durumu başarıyla güncellendi", "newStatus": new_status}
    except Exception as e:
        print(f"Sipariş durumu güncellenirken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Sipariş durumu güncellenemedi: {str(e)}") 