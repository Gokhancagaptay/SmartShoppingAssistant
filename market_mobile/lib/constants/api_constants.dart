import 'package:flutter/foundation.dart' show kIsWeb;

/// Uygulamanın bağlandığı FastAPI backend'inin temel URL'i.
/// Web ortamında localhost, Android emülatöründe 10.0.2.2 kullanılır.
/// Tüm servisler bu tek fonksiyonu içe aktarmalıdır; URL'yi tekrar tanımlamayın.
String getBaseUrl() {
  if (kIsWeb) {
    return 'http://localhost:8000';
  } else {
    return 'http://10.0.2.2:8000';
  }
}

/// Eski admin panel kodunda kullanılan isim; yalnızca kök host (path içermez).
String get baseUrl => getBaseUrl();

/// API prefix sabitlerini merkezi olarak tutar.
class ApiPaths {
  static const String auth = '/api/auth';
  static const String products = '/api/products';
  static const String recipes = '/api/recipes';
  static const String snacks = '/api/snacks';
  static const String admin = '/api/admin';
  static const String nutrition = '/api/nutrition';
  static const String stock = '/api/auth'; // stok endpoint'leri /api/auth altında
}
