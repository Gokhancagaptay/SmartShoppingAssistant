"""Beslenme ve stok özeti uçları; web dashboard ve mobil için hafif veri sağlar."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

from api.user import get_current_user
from database import get_stock_items

router = APIRouter()


class StockOverviewResponse(BaseModel):
    total_product_kinds: int
    total_units: float
    item_names: List[str]


@router.get("/stock-overview", summary="Kullanıcı stoğundan beslenme özeti")
async def nutrition_stock_overview(current_user: dict = Depends(get_current_user)) -> StockOverviewResponse:
    uid = current_user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Kullanıcı kimliği bulunamadı")

    raw: Dict[str, Any] = await get_stock_items(uid) or {}
    names: List[str] = []
    total_units = 0.0

    for _pid, data in raw.items():
        if not isinstance(data, dict):
            continue
        name = data.get("name")
        if name:
            names.append(str(name))
        try:
            total_units += float(data.get("quantity", 0) or 0)
        except (TypeError, ValueError):
            pass

    return StockOverviewResponse(
        total_product_kinds=len(names),
        total_units=total_units,
        item_names=sorted(set(names)),
    )
