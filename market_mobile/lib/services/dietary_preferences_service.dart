import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

/// Kullanıcının diyet tercihlerini backend'den alır ve kaydeder.
/// Tercihler ayrıca SharedPreferences'a cache'lenerek anlık erişim sağlanır.
class DietaryPreferencesService {
  static const _cacheKeyPrefix = 'dietary_prefs_';

  /// Diyet tercihlerini backend'den çeker.
  /// Önce cache'den okur, ardından API'den günceller.
  static Future<Map<String, dynamic>> fetchPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) return {'tags': [], 'custom_note': ''};

    // Cache'den oku
    final cached = prefs.getString('$_cacheKeyPrefix$uid');
    Map<String, dynamic> result = {'tags': [], 'custom_note': ''};
    if (cached != null) {
      try {
        result = Map<String, dynamic>.from(jsonDecode(cached) as Map);
      } catch (_) {}
    }

    // Backend'den güncelle
    try {
      final response = await http.get(
        Uri.parse('${getBaseUrl()}/api/auth/users/$uid/dietary-preferences'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        final data = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
        result = data;
        await prefs.setString('$_cacheKeyPrefix$uid', jsonEncode(data));
      }
    } catch (_) {
      // Cache varsa kullan, yoksa boş döner
    }
    return result;
  }

  /// Diyet tercihlerini backend'e kaydeder ve cache'i günceller.
  static Future<void> savePreferences({
    required List<String> tags,
    required String customNote,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) throw Exception('Oturum bulunamadı');

    final body = {'tags': tags, 'custom_note': customNote};
    final response = await http.put(
      Uri.parse('${getBaseUrl()}/api/auth/users/$uid/dietary-preferences'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );
    if (response.statusCode != 200) {
      throw Exception('Tercihler kaydedilemedi: ${response.statusCode}');
    }
    await prefs.setString('$_cacheKeyPrefix$uid', jsonEncode(body));
  }

  /// AI prompt'una eklenecek diyet bağlam metnini oluşturur.
  /// Tercih yoksa boş string döner.
  static Future<String> buildDietaryContext() async {
    final data = await fetchPreferences();
    final tags = (data['tags'] as List?)?.map((e) => e.toString()).toList() ?? [];
    final note = (data['custom_note'] as String?) ?? '';
    final parts = <String>[];
    if (tags.isNotEmpty) parts.add('Diyet etiketlerim: ${tags.join(', ')}.');
    if (note.trim().isNotEmpty) parts.add('Ek notum: ${note.trim()}');
    if (parts.isEmpty) return '';
    return '\n\n[Kullanıcı diyet tercihleri: ${parts.join(' ')}]';
  }

  /// Stok düşümünü tarife göre yapar.
  static Future<Map<String, dynamic>> deductRecipeStock({
    required List<Map<String, dynamic>> ingredients,
    required int servings,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) throw Exception('Oturum bulunamadı');

    final response = await http.post(
      Uri.parse('${getBaseUrl()}/api/auth/users/$uid/stock/deduct-recipe'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'ingredients': ingredients, 'servings': servings}),
    );
    if (response.statusCode == 200) {
      return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    }
    throw Exception('Stok güncellenemedi: ${response.statusCode} - ${response.body}');
  }
}
