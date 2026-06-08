import 'package:flutter/material.dart';

class FavoriteItem {
  final String id;
  final String name;
  final double price;
  final String imageUrl;
  final int stock;
  final String? unit;
  final String? label;
  final String category;

  const FavoriteItem({
    required this.id,
    required this.name,
    required this.price,
    required this.imageUrl,
    required this.stock,
    this.unit,
    this.label,
    required this.category,
  });
}

class FavoritesProvider extends ChangeNotifier {
  final Map<String, FavoriteItem> _items = {};

  Map<String, FavoriteItem> get items => Map.unmodifiable(_items);
  int get count => _items.length;
  bool isFavorite(String id) => _items.containsKey(id);

  void toggle({
    required String id,
    required String name,
    required double price,
    required String imageUrl,
    required int stock,
    String? unit,
    String? label,
    required String category,
  }) {
    if (_items.containsKey(id)) {
      _items.remove(id);
    } else {
      _items[id] = FavoriteItem(
        id: id,
        name: name,
        price: price,
        imageUrl: imageUrl,
        stock: stock,
        unit: unit,
        label: label,
        category: category,
      );
    }
    notifyListeners();
  }

  void remove(String id) {
    _items.remove(id);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}
