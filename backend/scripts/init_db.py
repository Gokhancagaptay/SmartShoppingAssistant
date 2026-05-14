import requests

# FastAPI ürün API — GET herkese açık; POST için admin Bearer token gerekir.
BASE_URL = "http://localhost:8000/api/products"

# Örnek ürünler (POST ile eklemek için ADMIN_TOKEN ortam değişkeni kullanın)
sample_products = [
    {
        "name": "Elma",
        "price": 15.99,
        "stock": 100,
        "image_url": "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg",
        "category": "meyve_sebze",
    },
    {
        "name": "Muz",
        "price": 12.99,
        "stock": 150,
        "image_url": "https://images.pexels.com/photos/1093038/pexels-photo-1093038.jpeg",
        "category": "meyve_sebze",
    },
    {
        "name": "Domates",
        "price": 8.99,
        "stock": 200,
        "image_url": "https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg",
        "category": "meyve_sebze",
    },
    {
        "name": "Tavuk Göğsü",
        "price": 45.99,
        "stock": 50,
        "image_url": "https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg",
        "category": "et_tavuk",
    },
]


def add_products():
    import os

    token = os.environ.get("ADMIN_TOKEN", "").strip()
    if not token:
        print("ADMIN_TOKEN tanımlı değil; POST atlanıyor. Örnek: set ADMIN_TOKEN=<firebase_id_token>")
        return
    print("Ürünler ekleniyor (POST /api/products/)...")
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    for product in sample_products:
        try:
            response = requests.post(f"{BASE_URL}/", json=product, headers=headers, timeout=30)
            if response.status_code == 200:
                print(f"OK {product['name']}")
            else:
                print(f"HATA {product['name']}: {response.status_code} {response.text}")
        except Exception as e:
            print(f"HATA {product['name']}: {e}")


def check_products():
    print("\nMevcut ürünler listeleniyor (GET /api/products/)...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=30)
        if response.status_code == 200:
            body = response.json()
            products = body if isinstance(body, list) else body.get("products", [])
            print("\nMevcut ürünler:")
            for product in products:
                print(f"- {product.get('name')} ({product.get('category')})")
        else:
            print(f"Ürünler alınırken hata: {response.text}")
    except Exception as e:
        print(f"Ürünler alınırken hata: {e}")


if __name__ == "__main__":
    add_products()
    check_products()
