import 'dart:convert';
import 'dart:convert' show utf8, base64Url;
import 'package:http/http.dart' as http;
import 'package:market_mobile/services/stock_service.dart';
import 'package:market_mobile/services/dietary_preferences_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

class AnalysisService {
  static Future<String> suggestRecipe(List<String> ingredients, {String? token}) async {
    try {
      print('Tarif önerisi isteği gönderiliyor...');
      print('İçerikler: ${ingredients.join(',')}');
      
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      final response = await http.post(
        Uri.parse('${getBaseUrl()}/api/recipes/suggest'),
        headers: headers,
        body: jsonEncode({'ingredients': ingredients.join(',')}),
      );

      print('Sunucu yanıtı: ${response.statusCode}');
      print('Yanıt içeriği: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['suggestion'] ?? 'Tarif önerisi alınamadı.';
      }
      throw Exception('Tarif önerisi alınamadı: ${response.statusCode} - ${response.body}');
    } catch (e) {
      print('Hata detayı: $e');
      return 'Tarif önerisi alınırken bir hata oluştu: $e';
    }
  }

  static Future<String> analyzeCartItems(List<String> ingredients, {String? token}) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
      final response = await http.post(
        Uri.parse('${getBaseUrl()}/api/recipes/analyze'),
        headers: headers,
        body: jsonEncode({'ingredients': ingredients}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['analysis'] ?? 'Analiz yapılamadı.';
      }
      throw Exception('Analiz yapılamadı: ${response.statusCode}');
    } catch (e) {
      return 'Analiz yapılırken bir hata oluştu: $e';
    }
  }

  static Future<String> priceAnalysis(List<String> ingredients) async {
    try {
      final response = await http.post(
        Uri.parse('${getBaseUrl()}/api/recipes/price'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ingredients': ingredients}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['price_analysis'] ?? 'Fiyat analizi yapılamadı.';
      }
      throw Exception('Fiyat analizi yapılamadı: ${response.statusCode}');
    } catch (e) {
      return 'Fiyat analizi yapılırken bir hata oluştu: $e';
    }
  }

  static Future<String> customQuestion(List<String> ingredients, String question) async {
    try {
      print('customQuestion çağrıldı. İçerikler: ${ingredients.join(',')}, Soru: $question');
      final response = await http.post(
        Uri.parse('${getBaseUrl()}/api/recipes/custom'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ingredients': ingredients,
          'question': question,
        }),
      );

      print('Sunucu yanıtı (customQuestion): ${response.statusCode}');
      print('Yanıt içeriği (customQuestion): ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['answer'] ?? 'Özelleştirilmiş soruya cevap alınamadı.';
      }
      throw Exception('Özelleştirilmiş soru yanıtlanamadı: ${response.statusCode} - ${response.body}');
    } catch (e) {
      print('Hata detayı (customQuestion): $e');
      return 'Özelleştirilmiş soru işlenirken bir hata oluştu: $e';
    }
  }

  static Future<String> breakfastSuggestion({
    required String userId,
    required String recipeType,
    String userRefinement = '',
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) throw Exception('Token bulunamadı');

    final parts = token.split('.');
    if (parts.length != 3) throw Exception('Geçersiz token formatı');
    
    final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
    final tokenUserId = payload['user_id'];
    
    await prefs.setString('userId', tokenUserId);

    // Stok listesini al
    final stockItems = await StockService.fetchUserStock();
    final stockNames = stockItems.map((item) => item['name'].toString()).toList();

    final url = '${getBaseUrl()}/api/recipes/breakfast-suggest';
    print('Kahvaltı önerisi isteği gönderiliyor...');
    print('URL: $url');
    print('Recipe Type: $recipeType');
    print('Stok Listesi: $stockNames');
    
    // Diyet tercihlerini al ve isteğe ekle
    final dietaryContext = await DietaryPreferencesService.buildDietaryContext();

    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token'
        },
        body: jsonEncode({
          'recipe_type': recipeType,
          'stock_items': stockNames,
          'dietary_preferences': dietaryContext,
          'user_refinement': userRefinement,
        }),
      );

      print('Sunucu yanıtı: ${response.statusCode}');
      print('Yanıt içeriği: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['suggestion'] ?? 'Öneri alınamadı';
      } else {
        throw Exception('Kahvaltı önerisi alınamadı: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Hata detayı: $e');
      throw Exception('Kahvaltı önerisi alınırken bir hata oluştu: $e');
    }
  }

  static Future<String> dinnerSuggestion({
    required String userId,
    required String suggestionType,
    String userRefinement = '',
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) throw Exception('Token bulunamadı');

    final parts = token.split('.');
    if (parts.length != 3) throw Exception('Geçersiz token formatı');
    
    final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
    final tokenUserId = payload['user_id'];
    
    await prefs.setString('userId', tokenUserId);

    // Stok listesini al
    final stockItems = await StockService.fetchUserStock();
    final stockNames = stockItems.map((item) => item['name'].toString()).toList();

    final url = '${getBaseUrl()}/api/recipes/dinner-suggest';
    print('Akşam yemeği önerisi isteği gönderiliyor...');
    print('URL: $url');
    print('Suggestion Type: $suggestionType');
    print('Stok Listesi: $stockNames');
    
    // Diyet tercihlerini al ve isteğe ekle
    final dietaryContext = await DietaryPreferencesService.buildDietaryContext();

    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token'
        },
        body: jsonEncode({
          'suggestion_type': suggestionType,
          'stock_items': stockNames,
          'dietary_preferences': dietaryContext,
          'user_refinement': userRefinement,
        }),
      );

      print('Sunucu yanıtı: ${response.statusCode}');
      print('Yanıt içeriği: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['suggestion'] ?? 'Öneri alınamadı';
      } else {
        throw Exception('Akşam yemeği önerisi alınamadı: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Hata detayı: $e');
      throw Exception('Akşam yemeği önerisi alınırken bir hata oluştu: $e');
    }
  }

  static Future<String> snackSuggestion({required String userId, required String snackType}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) throw Exception('Token bulunamadı');

    final parts = token.split('.');
    if (parts.length != 3) throw Exception('Geçersiz token formatı');
    
    final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
    final tokenUserId = payload['user_id'];
    
    await prefs.setString('userId', tokenUserId);

    // Stok listesini al
    final stockItems = await StockService.fetchUserStock();
    final stockNames = stockItems.map((item) => item['name'].toString()).toList();

    final url = '${getBaseUrl()}/api/snacks/suggest';
    print('Atıştırmalık önerisi isteği gönderiliyor...');
    print('URL: $url');
    print('Snack Type: $snackType');
    print('Stok Listesi: $stockNames');
    
    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token'
        },
        body: jsonEncode({
          'snack_type': snackType,
          'stock_items': stockNames
        }),
      );

      print('Sunucu yanıtı: ${response.statusCode}');
      print('Yanıt içeriği: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['suggestion'] ?? 'Öneri alınamadı';
      } else {
        throw Exception('Atıştırmalık önerisi alınamadı: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Hata detayı: $e');
      throw Exception('Atıştırmalık önerisi alınırken bir hata oluştu: $e');
    }
  }

  static Future<String> shoppingSuggestion({required String userId, required String listType}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) throw Exception('Token bulunamadı');

    final parts = token.split('.');
    if (parts.length != 3) throw Exception('Geçersiz token formatı');
    
    final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
    final tokenUserId = payload['user_id'];
    
    await prefs.setString('userId', tokenUserId);

    // Stok listesini al
    final stockItems = await StockService.fetchUserStock();
    final stockNames = stockItems.map((item) => item['name'].toString()).toList();

    final url = '${getBaseUrl()}/api/snacks/shopping';
    print('Alışveriş önerisi isteği gönderiliyor...');
    print('URL: $url');
    print('List Type: $listType');
    print('Stok Listesi: $stockNames');
    
    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token'
        },
        body: jsonEncode({
          'list_type': listType,
          'stock_items': stockNames
        }),
      );

      print('Sunucu yanıtı: ${response.statusCode}');
      print('Yanıt içeriği: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['suggestion'] ?? 'Öneri alınamadı';
      } else {
        throw Exception('Alışveriş önerisi alınamadı: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Hata detayı: $e');
      throw Exception('Alışveriş önerisi alınırken bir hata oluştu: $e');
    }
  }

  static Future<String> nutritionAnalysis({required String userId, required String analysisType}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) throw Exception('Token bulunamadı');

    final parts = token.split('.');
    if (parts.length != 3) throw Exception('Geçersiz token formatı');
    
    final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
    final tokenUserId = payload['user_id'];
    
    await prefs.setString('userId', tokenUserId);

    // Stok listesini al
    final stockItems = await StockService.fetchUserStock();
    final stockNames = stockItems.map((item) => item['name'].toString()).toList();

    final url = '${getBaseUrl()}/api/snacks/analyze';
    print('Beslenme analizi isteği gönderiliyor...');
    print('URL: $url');
    print('Analysis Type: $analysisType');
    print('Stok Listesi: $stockNames');
    
    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token'
        },
        body: jsonEncode({
          'analysis_type': analysisType,
          'stock_items': stockNames
        }),
      );

      print('Sunucu yanıtı: ${response.statusCode}');
      print('Yanıt içeriği: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['analysis'] ?? 'Analiz alınamadı';
      } else {
        throw Exception('Beslenme analizi alınamadı: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Hata detayı: $e');
      throw Exception('Beslenme analizi alınırken bir hata oluştu: $e');
    }
  }
} 