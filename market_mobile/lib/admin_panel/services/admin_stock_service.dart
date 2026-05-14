import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:market_mobile/constants/api_constants.dart'; // getBaseUrl için
import 'package:market_mobile/services/auth_service.dart'; // AuthService için

class AdminStockService {
  Future<List<Map<String, dynamic>>> fetchStockData() async {
    try {
      final url = '${getBaseUrl()}/api/products';
      print('AdminStockService: Stok verileri yükleniyor: $url');
      final headers = await AuthService.getAuthHeaders(); // Yetkilendirme başlıkları alındı
      final response = await http.get(Uri.parse(url), headers: headers);

      if (response.statusCode == 200) {
        final jsonData = json.decode(response.body);
        List<dynamic> productsData;
        if (jsonData is List) {
          productsData = jsonData;
        } else if (jsonData is Map && jsonData['products'] != null) {
          productsData = jsonData['products'];
        } else {
          print('AdminStockService: Beklenmeyen ürün veri formatı.');
          throw Exception('Beklenmeyen ürün veri formatı');
        }

        final stockList = productsData.map((product) => {
          'id': product['_id'] ?? product['id'] ?? '',
          'name': product['name'] ?? 'İsimsiz Ürün',
          'category': product['category'] ?? 'Diğer',
          'stock': product['stock'] ?? 0,
          'minStock': product['minStock'] ?? 10, // API'de yoksa varsayılan değer
          'price': product['price'] ?? 0.0,
          'lastUpdated': product['updatedAt'] != null
              ? DateFormat('yyyy-MM-dd').format(DateTime.parse(product['updatedAt']))
              : DateFormat('yyyy-MM-dd').format(DateTime.now()),
        }).toList().cast<Map<String, dynamic>>();
        print('AdminStockService: ${stockList.length} ürün stok bilgisi yüklendi.');
        return stockList;
      } else {
        print('AdminStockService: Stok verisi API hatası: ${response.statusCode}');
        throw Exception('API hatası: ${response.statusCode}');
      }
    } catch (e) {
      print('AdminStockService: Stok verisi yükleme hatası: $e');
      throw Exception('Bağlantı hatası: $e');
    }
  }

  Future<void> updateProductStock(String productId, int newStockValue) async {
    try {
      final url = '${getBaseUrl()}/api/products/$productId';
      print('AdminStockService: Stok güncelleniyor: $productId, Yeni Stok: $newStockValue');
      
      final Map<String, dynamic> body = {
        'stock': newStockValue,
      };

      final headers = await AuthService.getAuthHeaders(); // Yetkilendirme başlıkları alındı
      final response = await http.put(
        Uri.parse(url),
        headers: headers,
        body: json.encode(body), 
      );

      if (response.statusCode == 200) {
        print('AdminStockService: Ürün stoğu başarıyla güncellendi.');
      } else {
        print('AdminStockService: Stok güncelleme API hatası: ${response.statusCode} - ${response.body}');
        throw Exception('API hatası: ${response.statusCode}');
      }
    } catch (e) {
      print('AdminStockService: Stok güncelleme hatası: $e');
      throw Exception('Stok güncellenemedi: $e');
    }
  }
} 