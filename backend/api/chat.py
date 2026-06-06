import asyncio
from fastapi import APIRouter, Depends, HTTPException
from core.gemini_helper import _try_models, QUOTA_EXCEEDED_MESSAGE
from api.user import get_current_user
from database import products_collection

router = APIRouter()


@router.post("/question")
async def chat_question(request: dict, _user: dict = Depends(get_current_user)):
    question = request.get("question")
    stock_items = request.get("stock_items", [])

    if not question:
        raise HTTPException(status_code=400, detail="Soru boş olamaz")

    # RAG: fetch live store stock so the AI never suggests out-of-stock items
    out_of_stock: list[str] = []
    low_stock_items: list[str] = []
    in_stock_items: list[str] = []
    try:
        cursor = products_collection.find({}, {"name": 1, "stock": 1, "_id": 0}).limit(150)
        async for product in cursor:
            name = product.get("name", "")
            stock = int(product.get("stock", 0))
            if stock == 0:
                out_of_stock.append(name)
            elif stock <= 5:
                low_stock_items.append(f"{name} (son {stock} adet)")
            else:
                in_stock_items.append(name)
    except Exception:
        pass  # Proceed without store context if MongoDB unavailable

    store_context_parts: list[str] = []
    if out_of_stock:
        store_context_parts.append(f"STOKTA YOK (kesinlikle önerme): {', '.join(out_of_stock[:25])}")
    if low_stock_items:
        store_context_parts.append(f"Az kalan ürünler (uyar): {', '.join(low_stock_items[:15])}")
    if in_stock_items:
        store_context_parts.append(f"Mevcut ürünler: {', '.join(in_stock_items[:40])}")
    store_context = "\n".join(store_context_parts)

    prompt_text = (
        "Sen akıllı bir market alışveriş asistanısın.\n\n"
        + (f"MAĞAZA GÜNCEL STOK DURUMU:\n{store_context}\n\n" if store_context else "")
        + (f"Kullanıcının ev stoğu: {', '.join(stock_items)}\n\n" if stock_items else "")
        + f"Kullanıcının sorusu: \"{question}\"\n\n"
        "ÖNEMLİ KURALLAR:\n"
        "1. Stokta olmayan ürünleri ASLA önerme.\n"
        "2. Az kalan ürünler için kullanıcıyı uyar.\n"
        "3. Mağazada mevcut ürünleri tercih et.\n"
        "4. Kısa, net ve uygulanabilir yanıt ver."
    )

    data = {"contents": [{"parts": [{"text": prompt_text}]}]}

    response = await asyncio.to_thread(_try_models, data)

    if not response:
        raise HTTPException(status_code=500, detail="Yanıt oluşturulamadı")

    if response == QUOTA_EXCEEDED_MESSAGE:
        raise HTTPException(status_code=503, detail=response)

    return {"answer": response}