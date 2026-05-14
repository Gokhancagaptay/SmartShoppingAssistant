from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import List, Literal
from core.gemini_helper import (
    suggest_recipe, analyze_recipe,
    suggest_breakfast_recipe, suggest_dinner_recipe, suggest_lunch_recipe,
    QUOTA_EXCEEDED_MESSAGE,
)
from database import get_stock_items
from api.user import verify_token

router = APIRouter()

# Gemini'den dönen hata string'lerinin başlangıç kalıpları
_GEMINI_ERROR_PREFIXES = ("Hata:", "Günlük yapay zeka", "Yapay zeka servisi", "Tüm Gemini")


def _raise_if_gemini_error(text: str) -> None:
    """
    Gemini'den dönen metin bir hata mesajıysa uygun HTTP istisnası fırlatır.
    Böylece frontend'e ham hata string'i yerine doğru HTTP durum kodu ulaşır.
    """
    if not text:
        raise HTTPException(status_code=500, detail="Tarif önerisi oluşturulamadı.")
    for prefix in _GEMINI_ERROR_PREFIXES:
        if text.startswith(prefix):
            # Kota veya servis hatası — 503 ile ilet
            raise HTTPException(status_code=503, detail=text)


class IngredientInput(BaseModel):
    ingredients: str

class AnalysisRequest(BaseModel):
    ingredients: List[str]

class PriceRequest(BaseModel):
    ingredients: List[str]

class CustomQuestionRequest(BaseModel):
    ingredients: List[str]
    question: str

class DinnerSuggestionRequest(BaseModel):
    suggestion_type: Literal["quick", "medium", "long", "meatless", "soupy", "onepan"]
    dietary_preferences: str = ""
    user_refinement: str = ""

class BreakfastSuggestionRequest(BaseModel):
    recipe_type: Literal["quick", "eggy", "breadless", "sweet", "light", "cold"]
    dietary_preferences: str = ""
    user_refinement: str = ""

class LunchSuggestionRequest(BaseModel):
    lunch_type: Literal["quick", "light", "filling", "salad", "soup"]
    dietary_preferences: str = ""
    user_refinement: str = ""

def extract_stock_names(stock_items):
    print("DEBUG - extract_stock_names gelen veri:", stock_items)
    print("DEBUG - extract_stock_names veri tipi:", type(stock_items))
    
    stock_names = []
    
    if not stock_items:
        print("DEBUG - stock_items boş")
        return stock_names
        
    try:
        # Firebase'den gelen veri dictionary formatında
        if isinstance(stock_items, dict):
            # Her bir ürün için
            for item_data in stock_items.values():
                if isinstance(item_data, dict) and 'name' in item_data:
                    stock_names.append(item_data['name'])
        
        print("DEBUG - Çıkarılan isimler:", stock_names)
        return stock_names
    except Exception as e:
        print(f"DEBUG - extract_stock_names hatası: {str(e)}")
        return []

@router.post("/suggest", summary="Tarif Öner", description="Mevcut malzemelerle tarif önerir.")
def get_recipe_suggestion(input_data: IngredientInput):
    suggestion = suggest_recipe(input_data.ingredients)
    return {"suggestion": suggestion}

@router.post("/analyze", summary="Besin Analizi", description="Mevcut malzemelerle yapılacak bir yemeğin besin analizi ve sağlık değerlendirmesi.")
async def analyze_ingredients(request: AnalysisRequest):
    try:
        ingredients_str = ", ".join(request.ingredients)
        analysis = analyze_recipe(ingredients_str)
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/price", summary="Fiyat Analizi", description="Mevcut malzemelerin toplam fiyatını ve fiyat analizi yapar.")
async def price_analysis(request: PriceRequest):
    try:
        ingredients_str = ", ".join(request.ingredients)
        price_prompt = f"Aşağıdaki malzemelerin ortalama piyasa fiyatını ve toplam maliyetini TL cinsinden tahmini olarak hesaplar mısın? Malzemeler: {ingredients_str}"
        result = analyze_recipe(price_prompt)
        return {"price_analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/custom", summary="Özel Soru", description="Kullanıcının kendi yazdığı soruyu ve malzemeleri Gemini'ye iletir.")
async def custom_question(request: CustomQuestionRequest):
    try:
        ingredients_str = ", ".join(request.ingredients)
        custom_prompt = f"Malzemeler: {ingredients_str}\nSoru: {request.question}"
        result = analyze_recipe(custom_prompt)
        return {"answer": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/breakfast-suggest", summary="Kahvaltı Önerisi", description="Kullanıcının stoğuna ve seçilen tipe göre kahvaltı tarifi önerir.")
async def breakfast_suggestion(
    request: BreakfastSuggestionRequest = Body(...),
    user_data: tuple = Depends(verify_token)
):
    try:
        print("🔍 Kahvaltı önerisi isteği alındı")
        print(f"📦 Gelen veri: {request}")
        
        # Tuple'dan user ve role bilgisini al
        if not user_data or len(user_data) != 2:
            print("❌ Geçersiz kullanıcı verisi")
            raise HTTPException(
                status_code=401,
                detail="Geçersiz kullanıcı verisi"
            )
            
        user, role = user_data
        
        # User nesnesinden uid kontrolü
        if not user or not isinstance(user, dict) or 'uid' not in user:
            print("❌ Kullanıcı uid'si bulunamadı")
            raise HTTPException(
                status_code=400,
                detail="Kullanıcı bilgileri eksik"
            )
            
        uid = user['uid']
        print(f"👤 İşlem yapılan kullanıcı uid: {uid}")
        
        # Stok verilerini getir
        stock_items = await get_stock_items(uid, by_uid=True)
        
        if not stock_items:
            print("❌ Kullanıcının stoğunda ürün bulunamadı")
            raise HTTPException(
                status_code=400,
                detail="Stokta ürün bulunamadı. Lütfen önce stok ekleyiniz."
            )
            
        print(f"📦 Stok verileri başarıyla getirildi: {stock_items}")
        
        # Stock items'ı işle
        stock_names = []
        if isinstance(stock_items, dict):
            for item in stock_items.values():
                if isinstance(item, dict) and 'name' in item:
                    stock_names.append(item['name'])
        
        if not stock_names:
            print("❌ Stok verilerinden ürün isimleri çıkarılamadı")
            raise HTTPException(
                status_code=400,
                detail="Stok verilerinde geçerli ürün bulunamadı"
            )
            
        print(f"📝 İşlenmiş ürün isimleri: {stock_names}")
        
        # İsimleri string'e çevir
        ingredients = ", ".join(stock_names)
        print(f"🧾 Gemini'ye gönderilecek malzemeler: {ingredients}")
        
        # Gemini API'ye gönder (diyet tercihleri dahil)
        suggestion = suggest_breakfast_recipe(
            ingredients, request.recipe_type, request.dietary_preferences, request.user_refinement
        )
        _raise_if_gemini_error(suggestion)
        print("[RECIPE] Kahvalti onerisi basariyla olusturuldu")
        return {"suggestion": suggestion}
        
    except HTTPException as he:
        print(f"⚠️ HTTP Hatası: {str(he)}")
        raise he
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Bir hata oluştu: {str(e)}"
        )

@router.post("/dinner-suggest", summary="Akşam Yemeği Önerisi", description="Kullanıcının stoğuna ve seçilen tipe göre akşam yemeği tarifi önerir.")
async def dinner_suggestion(
    request: DinnerSuggestionRequest = Body(...),
    user_data: tuple = Depends(verify_token)
):
    try:
        print("🔍 Akşam yemeği önerisi isteği alındı")
        print(f"📦 Gelen veri: {request}")
        
        # Tuple'dan user ve role bilgisini al
        if not user_data or len(user_data) != 2:
            print("❌ Geçersiz kullanıcı verisi")
            raise HTTPException(
                status_code=401,
                detail="Geçersiz kullanıcı verisi"
            )
            
        user, role = user_data
        
        # User nesnesinden uid kontrolü
        if not user or not isinstance(user, dict) or 'uid' not in user:
            print("❌ Kullanıcı uid'si bulunamadı")
            raise HTTPException(
                status_code=400,
                detail="Kullanıcı bilgileri eksik"
            )
            
        uid = user['uid']
        print(f"👤 İşlem yapılan kullanıcı uid: {uid}")
        
        # Stok verilerini getir
        stock_items = await get_stock_items(uid, by_uid=True)
        
        if not stock_items:
            print("❌ Kullanıcının stoğunda ürün bulunamadı")
            raise HTTPException(
                status_code=400,
                detail="Stokta ürün bulunamadı. Lütfen önce stok ekleyiniz."
            )
            
        print(f"📦 Stok verileri başarıyla getirildi: {stock_items}")
        
        # Stock items'ı işle
        stock_names = []
        if isinstance(stock_items, dict):
            for item in stock_items.values():
                if isinstance(item, dict) and 'name' in item:
                    stock_names.append(item['name'])
        
        if not stock_names:
            print("❌ Stok verilerinden ürün isimleri çıkarılamadı")
            raise HTTPException(
                status_code=400,
                detail="Stok verilerinde geçerli ürün bulunamadı"
            )
            
        print(f"📝 İşlenmiş ürün isimleri: {stock_names}")
        
        # İsimleri string'e çevir
        ingredients = ", ".join(stock_names)
        print(f"🧾 Gemini'ye gönderilecek malzemeler: {ingredients}")
        
        # Gemini API'ye gönder (diyet tercihleri dahil)
        suggestion = suggest_dinner_recipe(
            ingredients, request.suggestion_type, request.dietary_preferences, request.user_refinement
        )
        _raise_if_gemini_error(suggestion)
        print("[RECIPE] Aksam yemegi onerisi basariyla olusturuldu")
        return {"suggestion": suggestion}
        
    except HTTPException as he:
        print(f"⚠️ HTTP Hatası: {str(he)}")
        raise he
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Bir hata oluştu: {str(e)}"
        )

@router.post("/lunch-suggest", summary="Öğle Yemeği Önerisi", description="Kullanıcının stoğuna ve seçilen tipe göre öğle yemeği tarifi önerir.")
async def lunch_suggestion(
    request: LunchSuggestionRequest = Body(...),
    user_data: tuple = Depends(verify_token)
):
    try:
        print("🔍 Öğle yemeği önerisi isteği alındı")
        print(f"📦 Gelen veri: {request}")
        
        # Tuple'dan user ve role bilgisini al
        if not user_data or len(user_data) != 2:
            print("❌ Geçersiz kullanıcı verisi")
            raise HTTPException(
                status_code=401,
                detail="Geçersiz kullanıcı verisi"
            )
            
        user, role = user_data
        
        # User nesnesinden uid kontrolü
        if not user or not isinstance(user, dict) or 'uid' not in user:
            print("❌ Kullanıcı uid'si bulunamadı")
            raise HTTPException(
                status_code=400,
                detail="Kullanıcı bilgileri eksik"
            )
            
        uid = user['uid']
        print(f"👤 İşlem yapılan kullanıcı uid: {uid}")
        
        # Stok verilerini getir
        stock_items = await get_stock_items(uid, by_uid=True)
        
        if not stock_items:
            print("❌ Kullanıcının stoğunda ürün bulunamadı")
            raise HTTPException(
                status_code=400,
                detail="Stokta ürün bulunamadı. Lütfen önce stok ekleyiniz."
            )
            
        print(f"📦 Stok verileri başarıyla getirildi: {stock_items}")
        
        # Stock items'ı işle
        stock_names = []
        if isinstance(stock_items, dict):
            for item in stock_items.values():
                if isinstance(item, dict) and 'name' in item:
                    stock_names.append(item['name'])
        
        if not stock_names:
            print("❌ Stok verilerinden ürün isimleri çıkarılamadı")
            raise HTTPException(
                status_code=400,
                detail="Stok verilerinde geçerli ürün bulunamadı"
            )
            
        print(f"📝 İşlenmiş ürün isimleri: {stock_names}")
        
        # İsimleri string'e çevir
        ingredients = ", ".join(stock_names)
        print(f"🧾 Gemini'ye gönderilecek malzemeler: {ingredients}")
        
        # Gemini API'ye gönder (diyet tercihleri dahil)
        suggestion = suggest_lunch_recipe(
            ingredients, request.lunch_type, request.dietary_preferences, request.user_refinement
        )
        _raise_if_gemini_error(suggestion)
        print("[RECIPE] Ogle yemegi onerisi basariyla olusturuldu")
        return {"suggestion": suggestion}
        
    except HTTPException as he:
        print(f"⚠️ HTTP Hatası: {str(he)}")
        raise he
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Bir hata oluştu: {str(e)}"
        )

@router.get("/test", summary="Test Endpoint", description="Router'ın doğru çalıştığını test etmek için.")
async def test_endpoint():
    return {"message": "Recipe router is working!"}
