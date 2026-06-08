import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class FavoritesService {
  static const _key = 'favorites_ids';

  static Future<List<String>> loadFavoriteIds() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_key) ?? [];
  }

  static Future<void> saveFavoriteIds(List<String> ids) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_key, ids);
  }

  static Future<void> toggleFavorite(String id) async {
    final ids = await loadFavoriteIds();
    if (ids.contains(id)) {
      ids.remove(id);
    } else {
      ids.add(id);
    }
    await saveFavoriteIds(ids);
  }

  static Future<bool> isFavorite(String id) async {
    final ids = await loadFavoriteIds();
    return ids.contains(id);
  }
}
