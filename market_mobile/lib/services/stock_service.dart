import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

class StockService {
  static Future<List<Map<String, dynamic>>> fetchUserStock() async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) return [];
    final url = '${getBaseUrl()}/api/auth/users/$uid/stock';
    final response = await http.get(
      Uri.parse(url),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  static Future<void> addOrUpdateStock(Map<String, dynamic> item) async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) return;
    
    // Önce mevcut stok durumunu kontrol et
    final currentStock = await fetchUserStock();
    final productId = item['id'];
    
    // Ürün zaten stokta mı kontrol et
    final existingItemIndex = currentStock.indexWhere((stockItem) => 
        stockItem['product_id'] == productId);
    
    double newQuantity = item['qty'];
    
    // Eğer ürün zaten stokta varsa, miktarı güncelle (üzerine ekle)
    if (existingItemIndex >= 0) {
      final existingItem = currentStock[existingItemIndex];
      // Mevcut miktar + yeni miktar
      newQuantity = (double.tryParse(existingItem['quantity'].toString()) ?? 0) + 
                    (double.tryParse(item['qty'].toString()) ?? 0);
      print('Stok güncelleniyor: ${item['name']} - Eski miktar: ${existingItem['quantity']}, Yeni miktar: $newQuantity');
    }
    
    final url = '${getBaseUrl()}/api/auth/users/$uid/stock';
    
    // Stok öğesi için gerekli alanları hazırla
    final stockItem = {
      'product_id': productId,
      'name': item['name'],
      'image_url': item['image_url'],
      'quantity': newQuantity,
      'unit': item['unit'],
      'category': (item['category'] ?? 'belirsiz'), // Kategori mutlaka eklenecek
      'price': item['price'],
      'stock': item['stock'],
    };

    await http.post(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(stockItem),
    );
  }

  static Future<void> deleteStockItem(String productId) async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) return;
    final url = '${getBaseUrl()}/api/auth/users/$uid/stock/$productId';
    await http.delete(
      Uri.parse(url),
      headers: {'Authorization': 'Bearer $token'},
    );
  }

  static Future<void> updateStockItemQuantity(String productId, double newQuantity, Map<String, dynamic> currentProductDetails) async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) {
      print("Error: UID or Token is null. Cannot update stock quantity.");
      return;
    }

    final url = '${getBaseUrl()}/api/auth/users/$uid/stock';
    
    // Miktarı güncellenmiş yeni stok öğesini oluştur
    // currentProductDetails, ürünün adını, kategorisini vb. içermeli
    final updatedStockItem = {
      'product_id': productId,
      'name': currentProductDetails['name'],
      'image_url': currentProductDetails['image_url'],
      'quantity': newQuantity,
      'unit': currentProductDetails['unit'],
      'category': currentProductDetails['category'],
      'price': currentProductDetails['price'], // Bu alanlar backend tarafından bekleniyorsa gönderilmeli
      'stock': currentProductDetails['stock'], // Bu genellikle genel ürün stoğu, kullanıcı stoğu değil.
                                            // Backend'in bu alanı nasıl işlediğine bağlı.
    };

    print("Updating stock for product ID: $productId with new quantity: $newQuantity via POST to $url");
    print("Payload: ${jsonEncode(updatedStockItem)}");

    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(updatedStockItem),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      print('Stock quantity updated successfully for $productId. New quantity: $newQuantity. Status: ${response.statusCode}');
    } else {
      print('Failed to update stock quantity for $productId. Status: ${response.statusCode}, Body: ${response.body}');
      throw Exception('Failed to update stock quantity. Status: ${response.statusCode}');
    }
  }
} 