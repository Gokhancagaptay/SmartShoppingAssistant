import asyncio
from fastapi import APIRouter, Depends, HTTPException
from core.gemini_helper import _try_models, QUOTA_EXCEEDED_MESSAGE
from api.user import get_current_user

router = APIRouter()


@router.post("/question")
async def chat_question(request: dict, _user: dict = Depends(get_current_user)):
    question = request.get("question")
    stock_items = request.get("stock_items", [])

    if not question:
        raise HTTPException(status_code=400, detail="Soru boş olamaz")

    prompt_text = (
        f"Kullanıcının stoğundaki ürünler: {', '.join(stock_items)}\n\n"
        f"Kullanıcının sorusu: \"{question}\"\n\n"
        "Sadece yukarıdaki stok ürünlerini kullanarak bu soruya anlamlı ve uygulanabilir bir yanıt ver. "
        "Yeni ürün önerme. Gerekirse sade bir tarif ver ama kullanıcıyı yormayacak şekilde açıkla."
    )

    data = {
        "contents": [{
            "parts": [{"text": prompt_text}]
        }]
    }

    # _try_models senkron bir fonksiyondur; asyncio event loop'u bloke etmemek için thread'de çalıştırılır
    response = await asyncio.to_thread(_try_models, data)

    if not response:
        raise HTTPException(status_code=500, detail="Yanıt oluşturulamadı")

    # Kota mesajını 503 olarak döndür ki frontend uyarı göstersin
    if response == QUOTA_EXCEEDED_MESSAGE:
        raise HTTPException(status_code=503, detail=response)

    return {"answer": response}