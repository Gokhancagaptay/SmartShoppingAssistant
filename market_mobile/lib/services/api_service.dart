import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product.dart';
import '../constants/api_constants.dart';

/// Genel amaçlı API servis sınıfı.
/// Ürün listesi, tarif önerisi ve besin analizi isteklerini yönetir.
class ApiService {
  /// Tüm ürünleri `/api/products/` endpoint'inden çeker.
  static Future<List<Product>> fetchProducts() async {
    final url = Uri.parse('${getBaseUrl()}${ApiPaths.products}/');
    final res = await http.get(url);
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as List;
      return data.map((e) => Product.fromJson(e)).toList();
    }
    throw Exception('Ürünler alınamadı (${res.statusCode})');
  }

  /// Verilen malzeme listesiyle tarif önerisi alır.
  static Future<String> suggestRecipe(List<String> names) async {
    final url = Uri.parse('${getBaseUrl()}${ApiPaths.recipes}/suggest');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'ingredients': names.join(',')}),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body)['suggestion'] ?? 'Cevap yok';
    }
    throw Exception('Tarif hatası (${res.statusCode})');
  }

  /// Verilen malzeme listesiyle besin analizi yapar.
  static Future<Map<String, dynamic>> analyze(List<String> names) async {
    final url = Uri.parse('${getBaseUrl()}${ApiPaths.recipes}/analyze');
    final res = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'ingredients': names.join(',')}),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body)['analysis'] as Map<String, dynamic>;
    }
    throw Exception('Analiz hatası (${res.statusCode})');
  }
}
