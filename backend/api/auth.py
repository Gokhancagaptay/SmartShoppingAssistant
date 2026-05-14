"""Geriye dönük uyumluluk: Bearer token ile kullanıcı çözümlemesi api.user içinde tekilleştirildi."""

from api.user import get_current_user

__all__ = ("get_current_user",)
