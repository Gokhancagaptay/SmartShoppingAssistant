from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import firebase_admin
from firebase_admin import credentials, auth
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import products_collection, reviews_collection
from api.user import router as user_router, get_current_user as firebase_bearer_user
from api.recipe import router as recipe_router
from api.product import router as product_router
from api.snack import router as snack_router
from api.admin import router as admin_router
from api.chat import router as chat_router
from api.nutrition import router as nutrition_router
from core.settings import parse_cors_settings

load_dotenv()

cred_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase.json")
if not os.path.exists(cred_path):
    raise FileNotFoundError(f"Firebase kimlik bilgileri dosyası bulunamadı: {cred_path}")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(
    cred,
    {
        "databaseURL": os.getenv(
            "FIREBASE_DATABASE_URL",
            "https://market-b596e-default-rtdb.europe-west1.firebasedatabase.app",
        )
    },
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await products_collection.create_index([("name", 1)], unique=True)
        await reviews_collection.create_index([("product_id", 1), ("uid", 1)], unique=True)
    except Exception:
        pass
    yield


app = FastAPI(
    title="Online Market API",
    description="Online Market Projesi için FastAPI backend",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

cors_origins, cors_credentials = parse_cors_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router, prefix="/api/auth", tags=["auth"])
app.include_router(product_router, prefix="/api/products", tags=["products"])
app.include_router(recipe_router, prefix="/api/recipes", tags=["recipes"])
app.include_router(snack_router, prefix="/api/snacks", tags=["snacks"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(nutrition_router, prefix="/api/nutrition", tags=["nutrition"])


@app.get("/routes")
async def list_routes():
    routes = [{"path": route.path, "methods": list(route.methods)} for route in app.routes]
    return {"routes": routes}


class UserProfile(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None


@app.get("/")
async def root():
    return {"message": "Online Market API'ye Hoş Geldiniz!"}


@app.get("/user/profile", response_model=UserProfile)
async def read_user_profile(current_user: dict = Depends(firebase_bearer_user)):
    return UserProfile(
        id=current_user["uid"],
        email=current_user.get("email") or "",
        display_name=current_user.get("name"),
    )
