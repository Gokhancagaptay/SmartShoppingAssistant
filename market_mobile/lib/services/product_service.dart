import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product.dart';
import '../constants/api_constants.dart';

/// Ürün verilerini FastAPI backend'inden çeken servis sınıfı.
class ProductService {
  /// Tüm ürünleri listeler. Filtre ve arama parametresi destekler.
  static Future<List<Product>> fetchProducts({
    String? searchQuery,
    String? category,
  }) async {
    final baseUrl = getBaseUrl();
    final queryParams = <String, String>{};
    if (searchQuery != null && searchQuery.isNotEmpty) {
      queryParams['search'] = searchQuery;
    }
    if (category != null && category.isNotEmpty) {
      queryParams['category'] = category;
    }

    final uri = Uri.parse('$baseUrl${ApiPaths.products}/')
        .replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((item) => Product.fromJson(item)).toList();
    } else {
      throw Exception('Ürünler getirilemedi. (${response.statusCode})');
    }
  }

  /// Belirli bir kategorideki ürünleri listeler (`GET /api/products/?category=`).
  static Future<List<Product>> fetchProductsByCategory(String category) async {
    final baseUrl = getBaseUrl();
    final uri = Uri.parse('$baseUrl${ApiPaths.products}/').replace(
      queryParameters: {'category': category},
    );
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((item) => Product.fromJson(item)).toList();
    } else {
      throw Exception('Kategori ürünleri getirilemedi. (${response.statusCode})');
    }
  }

  /// Mevcut ürün kategorilerini listeler.
  static Future<List<String>> fetchCategories() async {
    final baseUrl = getBaseUrl();
    final uri = Uri.parse('$baseUrl${ApiPaths.products}/categories');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<String>();
    } else {
      throw Exception('Kategoriler getirilemedi. (${response.statusCode})');
    }
  }
}
