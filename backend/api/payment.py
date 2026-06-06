import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from api.user import verify_token
from database import payment_intents_collection

router = APIRouter()


class CreateIntentRequest(BaseModel):
    amount: float          # kuruş cinsinden (örn: 4990 = 49.90 TL)
    currency: str = "TRY"
    payment_method: Optional[str] = None   # "card" | "cash"
    description: Optional[str] = None


@router.post("/create-intent", summary="Ödeme İşlemi Başlat (Payment Intent)")
async def create_payment_intent(
    body: CreateIntentRequest,
    user_data: tuple = Depends(verify_token),
):
    """
    Gerçek ödeme entegrasyonuna (Stripe/Iyzico) hazırlık.
    Şu an mock olarak çalışır; gerçek gateway'de bu uç nokta
    ödeme sağlayıcısından client_secret alır ve frontend'e döner.
    """
    user, _ = user_data
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Tutar sıfırdan büyük olmalıdır.")

    intent_id = f"pi_{secrets.token_hex(12)}"
    client_secret = f"{intent_id}_secret_{secrets.token_hex(8)}"

    intent_doc = {
        "intent_id": intent_id,
        "uid": user["uid"],
        "amount": body.amount,
        "currency": body.currency,
        "payment_method": body.payment_method,
        "description": body.description,
        "status": "requires_confirmation",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        await payment_intents_collection.insert_one(intent_doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment intent oluşturulamadı: {str(e)}")

    return {
        "intent_id": intent_id,
        "client_secret": client_secret,
        "amount": body.amount,
        "currency": body.currency,
        "status": "requires_confirmation",
    }


@router.post("/{intent_id}/confirm", summary="Ödemeyi Onayla")
async def confirm_payment_intent(
    intent_id: str,
    user_data: tuple = Depends(verify_token),
):
    """
    Ödeme onaylama (mock).
    Gerçek entegrasyonda: Stripe/Iyzico'dan ödeme onayı alınır.
    """
    user, _ = user_data
    intent = await payment_intents_collection.find_one(
        {"intent_id": intent_id, "uid": user["uid"]}
    )
    if not intent:
        raise HTTPException(status_code=404, detail="Payment intent bulunamadı.")
    if intent.get("status") == "succeeded":
        return {"intent_id": intent_id, "status": "succeeded"}

    await payment_intents_collection.update_one(
        {"intent_id": intent_id},
        {"$set": {"status": "succeeded", "confirmed_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"intent_id": intent_id, "status": "succeeded"}
