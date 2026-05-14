# core/gemini_helper.py

import requests
from core.settings import GEMINI_API_KEY
import google.generativeai as genai
from typing import List
import logging

# Logging ayarları
logger = logging.getLogger(__name__)

# Gemini yapılandırması
genai.configure(api_key=GEMINI_API_KEY)

# Model listesi — en yüksek ücretsiz kotaya sahip modeller önce denenir (2026 itibarıyla).
# Gemini 2.5 Flash serisi en geniş ücretsiz kotaya sahiptir.
MODELS = [
    "gemini-2.5-flash-preview-04-17",  # 2026 ücretsiz kota desteği olan en güncel model
    "gemini-2.5-flash",                # Alternatif 2.5 flash endpoint
    "gemini-2.0-flash-lite",           # Düşük maliyet, ücretsiz katman
    "gemini-1.5-flash-8b",             # Küçük, yüksek kotalu model
    "gemini-1.5-flash",                # Orta kota
    "gemini-2.0-flash",                # Daha kısıtlı ücretsiz kota
    "gemini-1.5-pro",                  # Düşük ücretsiz kota
]

# Tüm modeller kota aşıldığında kullanıcıya gösterilecek açıklayıcı mesaj
QUOTA_EXCEEDED_MESSAGE = (
    "Günlük yapay zeka kotası doldu. "
    "Gemini API ücretsiz katmanı günlük sınırına ulaşıldı. "
    "Birkaç saat sonra tekrar deneyin veya Google AI Studio'dan yeni bir API anahtarı oluşturun: "
    "https://aistudio.google.com/app/apikey"
)


def _try_models(data: dict) -> str:
    """
    MODELS listesindeki modelleri sırayla dener.
    - 200: başarılı yanıt döner.
    - 404: model mevcut değil, bir sonrakine geç.
    - 429: kota aşıldı, bir sonrakine geç.
    - Diğer hatalar: döngüyü kır ve hata mesajını döndür.
    Tüm modeller 429 / 404 dönerse kullanıcı dostu Türkçe mesaj döner.
    """
    headers = {"Content-Type": "application/json"}
    params = {"key": GEMINI_API_KEY}
    last_status = None
    last_is_quota = False

    for model_id in MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent"
        print(f"[GEMINI] Denenen model: {model_id}")
        response = requests.post(url, headers=headers, params=params, json=data)
        last_status = response.status_code
        print(f"[GEMINI] Yanıt kodu: {last_status}")

        if last_status == 200:
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]

        if last_status == 429:
            # Kota aşıldı — bir sonraki modeli dene
            last_is_quota = True
            print(f"[GEMINI] {model_id} kotası doldu, sonraki model deneniyor...")
            continue

        if last_status in (404, 503):
            # Model bulunamadı veya geçici olarak meşgul — bir sonraki modeli dene
            print(f"[GEMINI] {model_id} yanıt vermedi ({last_status}), sonraki model deneniyor...")
            continue

        # Beklenmeyen hata — döngüyü durdur
        return f"Hata: {last_status} - {response.text}"

    # Tüm modeller başarısız oldu
    if last_is_quota:
        return QUOTA_EXCEEDED_MESSAGE
    if last_status == 503:
        return (
            "Yapay zeka servisi şu an yoğun talep nedeniyle geçici olarak kullanılamıyor. "
            "Lütfen birkaç dakika sonra tekrar deneyin."
        )
    return f"Tüm Gemini modelleri yanıt vermedi. Son durum kodu: {last_status}"


def suggest_recipe(ingredients):
    data = {
        "contents": [{
            "parts": [{
                "text": f"Lütfen {ingredients} ile yapılabilecek pratik bir yemek tarifi öner. Tarifi adım adım açıkla."
            }]
        }]
    }
    return _try_models(data)


def analyze_recipe(ingredients):
    data = {
        "contents": [{
            "parts": [{
                "text": f"Aşağıdaki malzemelerle hazırlanacak bir yemeğin yaklaşık besin değerlerini (kalori, protein, karbonhidrat, yağ) ve sağlıklı olup olmadığına dair kısa bir analiz raporu hazırlar mısın?\nMalzemeler: {ingredients}"
            }]
        }]
    }
    return _try_models(data)


def _build_dietary_constraint(dietary_preferences: str) -> str:
    """
    Diyet tercihleri varsa prompt'a eklenecek kısıt metnini oluşturur.
    Tercih boşsa boş string döner.
    """
    if not dietary_preferences or not dietary_preferences.strip():
        return ""
    return (
        f"\n\nÖNEMLİ DİYET KISITLAMALARI: Kullanıcının diyet tercihleri şunlardır: {dietary_preferences.strip()}"
        " Bu tercihlere kesinlikle uy. Uygun olmayan malzemeleri kullanan tarif önerme;"
        " bunun yerine kısıtlamalara uyan alternatif bir tarif sun."
    )


def _user_refinement_block(user_refinement: str) -> str:
    s = (user_refinement or "").strip()
    if not s:
        return ""
    return (
        f"\n\nEK KULLANICI TALİMATI (öncelikli uygula): {s}\n"
        "Önceki bir öneri varsa ondan belirgin şekilde farklı bir tarif sun; aynı yemeği veya çok benzer bir kombinasyonu tekrarlama."
    )


def suggest_breakfast_recipe(
    ingredients: str,
    recipe_type: str,
    dietary_preferences: str = "",
    user_refinement: str = "",
) -> str:
    """
    Kahvaltı tarifi önerir.
    dietary_preferences: frontend'den gelen diyet bağlamı metni (opsiyonel)
    """
    diet_constraint = _build_dietary_constraint(dietary_preferences)
    prompt = ""
    if recipe_type == "quick":
        prompt = f"Bu ürünlerle pratik ve hızlı hazırlanabilecek bir kahvaltı öner: {ingredients}"
    elif recipe_type == "eggy":
        prompt = f"Bu ürünlerle yumurtalı bir kahvaltı tarifi öner: {ingredients}"
    elif recipe_type == "breadless":
        prompt = f"Bu ürünlerle ekmeksiz bir kahvaltı tarifi öner: {ingredients}"
    elif recipe_type == "sweet":
        prompt = f"Bu ürünlerle tatlı ağırlıklı bir kahvaltı tarifi öner: {ingredients}"
    elif recipe_type == "light":
        prompt = f"Bu ürünlerle hafif ve sade bir kahvaltı tarifi öner: {ingredients}"
    elif recipe_type == "cold":
        prompt = f"Bu ürünlerle pişirme gerektirmeyen, soğuk servis edilen bir kahvaltı öner: {ingredients}"
    prompt += diet_constraint
    prompt += _user_refinement_block(user_refinement)

    prompt += """
    Kurallar:
    1. Sadece verilen ürünleri kullan (tuz, yağ, baharat serbest)
    2. Tüm ürünleri kullanmak zorunda değilsin
    3. Sadece 1 tarif ver
    4. Tarif sade, uygulanabilir ve ev ortamına uygun olsun
    5. Daha önce aynı stokla tarif verildiyse bu kez farklı bir öneri sun
    
    Tarif formatı şu şekilde olmalı:
    
    🍳 [TARİF ADI]
    
    📋 Malzemeler:
    - Malzeme 1 (Genel Porsiyon)
    - Malzeme 2 (Genel Porsiyon)
    ...
    
    👩‍🍳 Hazırlanışı:
    1. Adım 1
    2. Adım 2
    ...
    
    ⏱️ Hazırlama Süresi: XX dakika
    👥 Porsiyon: X kişilik (Tarifte belirtilen genel porsiyon sayısı)
    
    💡 İpucu: [Varsa özel bir ipucu veya öneri]

    ÖNEMLİ EK BİLGİ:
    Yukarıdaki tarife ek olarak, lütfen tarifte kullanılan ve stokta bulunan temel malzemelerin **1 (bir) kişilik porsiyon için** yaklaşık miktarlarını aşağıdaki JSON formatında, özel etiketler arasına yerleştirerek verin. Bu JSON bloğu, normal tarif metninden sonra gelmelidir.
    Format:
    [MALZEMELER_JSON_START]
    {
      "ingredients_for_one": [
        { "product_name": "MALZEME_ADI_1", "quantity": MİKTAR_SAYISAL_1, "unit": "BİRİM_1" },
        { "product_name": "MALZEME_ADI_2", "quantity": MİKTAR_SAYISAL_2, "unit": "BİRİM_2" }
      ]
    }
    [MALZEMELER_JSON_END]
    
    Örnek JSON:
    [MALZEMELER_JSON_START]
    {
      "ingredients_for_one": [
        { "product_name": "Yumurta", "quantity": 2, "unit": "adet" },
        { "product_name": "Domates", "quantity": 0.5, "unit": "adet" },
        { "product_name": "Sucuk", "quantity": 20, "unit": "gram" }
      ]
    }
    [MALZEMELER_JSON_END]
    Bu JSON içindeki 'product_name' alanı, stokta bulunan genel ürün adını (örneğin 'Domates', 'Süt', 'Yumurta') yansıtmalıdır. 'quantity' sayısal bir değer olmalı, 'unit' ise 'adet', 'gram', 'ml', 'yemek kaşığı' gibi bir birim olmalıdır.
    """
    
    data = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    return _try_models(data)


def suggest_dinner_recipe(
    ingredients: str,
    suggestion_type: str,
    dietary_preferences: str = "",
    user_refinement: str = "",
) -> str:
    """
    Akşam yemeği tarifi önerir.
    dietary_preferences: frontend'den gelen diyet bağlamı metni (opsiyonel)
    """
    diet_constraint = _build_dietary_constraint(dietary_preferences)
    prompt = ""
    if suggestion_type == "quick":
        prompt = f"Bu ürünlerle pratik ve hızlı hazırlanabilecek bir akşam yemeği öner: {ingredients}"
    elif suggestion_type == "medium":
        prompt = f"Bu ürünlerle orta zorlukta bir akşam yemeği tarifi öner: {ingredients}"
    elif suggestion_type == "long":
        prompt = f"Bu ürünlerle daha detaylı ve özel bir akşam yemeği tarifi öner: {ingredients}"
    elif suggestion_type == "meatless":
        prompt = f"Bu ürünlerle etsiz bir akşam yemeği tarifi öner: {ingredients}"
    elif suggestion_type == "soupy":
        prompt = f"Bu ürünlerle çorba ağırlıklı bir akşam yemeği öner: {ingredients}"
    elif suggestion_type == "onepan":
        prompt = f"Bu ürünlerle tek kapta hazırlanabilecek bir akşam yemeği öner: {ingredients}"
    prompt += diet_constraint
    prompt += _user_refinement_block(user_refinement)

    prompt += """
    Kurallar:
    1. Sadece verilen ürünleri kullan (tuz, yağ, baharat serbest)
    2. Tüm ürünleri kullanmak zorunda değilsin
    3. Sadece 1 tarif ver
    4. Tarif sade, uygulanabilir ve ev ortamına uygun olsun
    5. Daha önce aynı stokla tarif verildiyse bu kez farklı bir öneri sun
    
    Tarif formatı şu şekilde olmalı:
    
    🍳 [TARİF ADI]
    
    📋 Malzemeler:
    - Malzeme 1 (Genel Porsiyon)
    - Malzeme 2 (Genel Porsiyon)
    ...
    
    👩‍🍳 Hazırlanışı:
    1. Adım 1
    2. Adım 2
    ...
    
    ⏱️ Hazırlama Süresi: XX dakika
    👥 Porsiyon: X kişilik (Tarifte belirtilen genel porsiyon sayısı)
    
    💡 İpucu: [Varsa özel bir ipucu veya öneri]

    ÖNEMLİ EK BİLGİ:
    Yukarıdaki tarife ek olarak, lütfen tarifte kullanılan ve stokta bulunan temel malzemelerin **1 (bir) kişilik porsiyon için** yaklaşık miktarlarını aşağıdaki JSON formatında, özel etiketler arasına yerleştirerek verin. Bu JSON bloğu, normal tarif metninden sonra gelmelidir.
    Format:
    [MALZEMELER_JSON_START]
    {
      "ingredients_for_one": [
        { "product_name": "MALZEME_ADI_1", "quantity": MİKTAR_SAYISAL_1, "unit": "BİRİM_1" },
        { "product_name": "MALZEME_ADI_2", "quantity": MİKTAR_SAYISAL_2, "unit": "BİRİM_2" }
      ]
    }
    [MALZEMELER_JSON_END]
    
    Örnek JSON:
    [MALZEMELER_JSON_START]
    {
      "ingredients_for_one": [
        { "product_name": "Yumurta", "quantity": 2, "unit": "adet" },
        { "product_name": "Domates", "quantity": 0.5, "unit": "adet" },
        { "product_name": "Sucuk", "quantity": 20, "unit": "gram" }
      ]
    }
    [MALZEMELER_JSON_END]
    Bu JSON içindeki 'product_name' alanı, stokta bulunan genel ürün adını (örneğin 'Domates', 'Süt', 'Yumurta') yansıtmalıdır. 'quantity' sayısal bir değer olmalı, 'unit' ise 'adet', 'gram', 'ml', 'yemek kaşığı' gibi bir birim olmalıdır.
    """
    
    data = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    return _try_models(data)


def suggest_snack(stock_items: List[str], snack_type: str) -> str:
    """
    Stok listesine göre atıştırmalık önerir
    """
    try:
        stock_text = ", ".join(stock_items)
        
        prompts = {
            "sweet": f"Bu malzemelerle tatlı bir atıştırmalık tarifi öner: {stock_text}",
            "salty": f"Bu malzemelerle tuzlu bir atıştırmalık tarifi öner: {stock_text}",
            "no_cooking": f"Bu malzemelerle fırın veya ocak gerektirmeyen bir atıştırmalık tarifi öner: {stock_text}",
            "movie_night": f"Bu malzemelerle film izlerken yenilebilecek bir atıştırmalık tarifi öner: {stock_text}",
            "diet_friendly": f"Bu malzemelerle sağlıklı ve düşük kalorili bir atıştırmalık tarifi öner: {stock_text}",
            "quick": f"Bu malzemelerle 5 dakikada hazırlanabilecek bir atıştırmalık tarifi öner: {stock_text}"
        }
        
        prompt = prompts.get(snack_type)
        if not prompt:
            return "Geçersiz atıştırmalık tipi"
            
        data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        return _try_models(data)
        
    except Exception as e:
        logger.error(f"Atıştırmalık önerisi hatası: {str(e)}")
        return "Öneri oluşturulamadı"


def analyze_nutrition(stock_items: List[str], analysis_type: str) -> str:
    """
    Stok listesine göre beslenme analizi yapar
    """
    try:
        stock_text = ", ".join(stock_items)
        
        prompts = {
            "balance": f"Bu stok listesine göre protein, karbonhidrat, yağ, lif ve vitamin açısından genel bir beslenme dengesi analizi yap: {stock_text}",
            "carb_protein": f"Bu stoktaki ürünlere göre karbonhidrat ve protein dengesi analizini yap: {stock_text}",
            "veggie_recipe": f"Bu malzemelerle sebze temelli, sağlıklı bir tarif öner: {stock_text}",
            "low_calorie": f"Bu malzemelerle düşük kalorili, hafif ve sağlıklı bir yemek öner: {stock_text}",
            "immune_boost": f"Bu malzemelerle bağışıklık sistemini destekleyecek bir tarif öner: {stock_text}",
            "post_workout": f"Bu malzemelerle egzersiz sonrası tüketilebilecek, toparlayıcı bir tarif öner: {stock_text}",
            "calorie_specific": f"Bu malzemelerle 1300-1500 kaloriye uygun bir öğün öner (porsiyon ve malzeme miktarını belirt): {stock_text}",
            "vitamin_rich": f"Bu malzemelerle A, B, C veya D vitamini açısından zengin bir tarif öner: {stock_text}"
        }
        
        prompt = prompts.get(analysis_type)
        if not prompt:
            return "Geçersiz analiz tipi"
            
        data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        return _try_models(data)
        
    except Exception as e:
        logger.error(f"Beslenme analizi hatası: {str(e)}")
        return "Analiz oluşturulamadı"


def suggest_shopping(stock_items: List[str], list_type: str) -> str:
    """
    Stok listesine göre alışveriş önerileri sunar
    """
    try:
        stock_text = ", ".join(stock_items)
        
        prompts = {
            "basic_needs": f"Bu stok listesine göre temel mutfak ve kahvaltılık eksikler neler? Kategorilere göre analiz yap: {stock_text}",
            "three_day_plan": f"Bu stokla 3 gün boyunca yemek yapabilmek için eksik olan temel ürünleri listele: {stock_text}",
            "breakfast_essentials": f"Kahvaltı hazırlamak için eksik olan temel ürünleri listele (yumurta, peynir, ekmek, zeytin gibi): {stock_text}",
            "essential_items": f"Mutfakta sürekli bulunması gereken ürünlerden eksik olanları listele: {stock_text}",
            "protein_focused": f"Protein bakımından yetersiz olan stoğa göre takviye alışveriş listesi oluştur: {stock_text}",
            "clean_eating": f"Haftalık temiz beslenme için eksik olan ürünleri listele (sebze, baklagil, tam tahıl ağırlıklı): {stock_text}"
        }
        
        prompt = prompts.get(list_type)
        if not prompt:
            return "Geçersiz liste tipi"
            
        data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        return _try_models(data)
        
    except Exception as e:
        logger.error(f"Alışveriş önerisi hatası: {str(e)}")
        return "Öneri oluşturulamadı"


def answer_custom_question(stock_items: List[str], question: str) -> str:
    """
    Kullanıcının özel sorusunu yanıtlar
    """
    try:
        stock_text = ", ".join(stock_items)
        prompt = f"Stok listesi: {stock_text}\n\nSoru: {question}\n\nSadece stok ürünlerini kullanarak yanıt ver."
        
        data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        return _try_models(data)
        
    except Exception as e:
        logger.error(f"Özel soru yanıtlama hatası: {str(e)}")
        return "Yanıt oluşturulamadı"


def suggest_lunch_recipe(
    ingredients: str,
    recipe_type: str,
    dietary_preferences: str = "",
    user_refinement: str = "",
) -> str:
    """
    Öğle yemeği tarifi önerir.
    dietary_preferences: frontend'den gelen diyet bağlamı metni (opsiyonel)
    """
    diet_constraint = _build_dietary_constraint(dietary_preferences)
    prompt = ""
    if recipe_type == "quick":
        prompt = f"Bu ürünlerle pratik ve hızlı hazırlanabilecek bir öğle yemeği öner: {ingredients}"
    elif recipe_type == "light":
        prompt = f"Bu ürünlerle hafif ve sade bir öğle yemeği tarifi öner: {ingredients}"
    elif recipe_type == "filling":
        prompt = f"Bu ürünlerle doyurucu bir öğle yemeği tarifi öner: {ingredients}"
    elif recipe_type == "salad":
        prompt = f"Bu ürünlerle salata veya salata ağırlıklı bir öğle yemeği öner: {ingredients}"
    elif recipe_type == "soup":
        prompt = f"Bu ürünlerle çorba veya çorba ağırlıklı bir öğle yemeği öner: {ingredients}"
    else:
        prompt = f"Bu ürünlerle pratik bir öğle yemeği öner: {ingredients}"
    prompt += diet_constraint
    prompt += _user_refinement_block(user_refinement)

    prompt += """
    Kurallar:
    1. Sadece verilen ürünleri kullan (tuz, yağ, baharat serbest)
    2. Tüm ürünleri kullanmak zorunda değilsin
    3. Sadece 1 tarif ver
    4. Tarif sade, uygulanabilir ve ev ortamına uygun olsun
    5. Daha önce aynı stokla tarif verildiyse bu kez farklı bir öneri sun
    
    Tarif formatı şu şekilde olmalı:
    
    🍳 [TARİF ADI]
    
    📋 Malzemeler:
    - Malzeme 1 (Genel Porsiyon)
    - Malzeme 2 (Genel Porsiyon)
    ...
    
    👩‍🍳 Hazırlanışı:
    1. Adım 1
    2. Adım 2
    ...
    
    ⏱️ Hazırlama Süresi: XX dakika
    👥 Porsiyon: X kişilik (Tarifte belirtilen genel porsiyon sayısı)
    
    💡 İpucu: [Varsa özel bir ipucu veya öneri]

    ÖNEMLİ EK BİLGİ:
    Yukarıdaki tarife ek olarak, lütfen tarifte kullanılan ve stokta bulunan temel malzemelerin **1 (bir) kişilik porsiyon için** yaklaşık miktarlarını aşağıdaki JSON formatında, özel etiketler arasına yerleştirerek verin. Bu JSON bloğu, normal tarif metninden sonra gelmelidir.
    Format:
    [MALZEMELER_JSON_START]
    {
      "ingredients_for_one": [
        { "product_name": "MALZEME_ADI_1", "quantity": MİKTAR_SAYISAL_1, "unit": "BİRİM_1" },
        { "product_name": "MALZEME_ADI_2", "quantity": MİKTAR_SAYISAL_2, "unit": "BİRİM_2" }
      ]
    }
    [MALZEMELER_JSON_END]
    
    Örnek JSON:
    [MALZEMELER_JSON_START]
    {
      "ingredients_for_one": [
        { "product_name": "Yumurta", "quantity": 2, "unit": "adet" },
        { "product_name": "Domates", "quantity": 0.5, "unit": "adet" },
        { "product_name": "Sucuk", "quantity": 20, "unit": "gram" }
      ]
    }
    [MALZEMELER_JSON_END]
    Bu JSON içindeki 'product_name' alanı, stokta bulunan genel ürün adını (örneğin 'Domates', 'Süt', 'Yumurta') yansıtmalıdır. 'quantity' sayısal bir değer olmalı, 'unit' ise 'adet', 'gram', 'ml', 'yemek kaşığı' gibi bir birim olmalıdır.
    """
    
    data = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    return _try_models(data)