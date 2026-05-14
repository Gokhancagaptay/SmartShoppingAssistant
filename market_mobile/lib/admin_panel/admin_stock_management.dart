import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../firebase/firebase_web_stub.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../constants/constants.dart';
import '../models/stock_item.dart';
import 'widgets/admin_topbar.dart';
import 'widgets/admin_table.dart';

class AdminStockManagement extends StatefulWidget {
  const AdminStockManagement({Key? key}) : super(key: key);

  @override
  State<AdminStockManagement> createState() => _AdminStockManagementState();
}

class _AdminStockManagementState extends State<AdminStockManagement> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _stockItems = [];
  List<Map<String, dynamic>> _productData = [];
  String _searchQuery = '';
  String? _selectedCategory;
  final TextEditingController _searchController = TextEditingController();

  final List<String> _categories = [
    'Tüm Kategoriler',
    'meyve_sebze',
    'et_tavuk',
    'süt_kahvaltı',
    'temel_gıda',
    'içecek',
    'atıştırmalık',
    'temizlik'
  ];

  @override
  void initState() {
    super.initState();
    _loadStockData();
  }

  Future<void> _loadStockData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // 1. Ürün verilerini MongoDB'den yükle
      final productsResponse = await http.get(Uri.parse('${getBaseUrl()}${ApiPaths.products}'));
      
      if (productsResponse.statusCode == 200) {
        final List<dynamic> productsJson = jsonDecode(productsResponse.body);
        _productData = productsJson.map((json) => Map<String, dynamic>.from(json)).toList();
      } else {
        _showErrorSnackBar('Ürün verileri yüklenemedi. Status: ${productsResponse.statusCode}');
      }

      // 2. Stok verilerini Firebase'den yükle
      final usersRef = FirebaseDatabase.instance.ref('users');
      final usersSnapshot = await usersRef.get();
      
      List<Map<String, dynamic>> allStockItems = [];
      
      if (usersSnapshot.exists && usersSnapshot.value != null) {
        final Map<dynamic, dynamic> usersData = usersSnapshot.value as Map;
        
        // Her kullanıcının stok verilerini toplama
        usersData.forEach((userId, userData) {
          if (userData is Map && userData['stock_items'] is Map) {
            final Map<dynamic, dynamic> stockItems = userData['stock_items'] as Map;
            final String userName = userData['name'] ?? 'İsimsiz Kullanıcı';
            
            stockItems.forEach((itemId, itemData) {
              if (itemData is Map) {
                // Ürün detaylarını eşleştir
                Map<String, dynamic>? productDetails;
                for (var product in _productData) {
                  if (product['_id'] == itemId || product['id'] == itemId) {
                    productDetails = product;
                    break;
                  }
                }
                
                allStockItems.add({
                  'id': itemId,
                  'userId': userId,
                  'userName': userName,
                  'quantity': itemData['quantity'] ?? 0,
                  'lastUpdated': itemData['lastUpdated'] ?? DateTime.now().toIso8601String(),
                  'productName': productDetails?['name'] ?? 'Bilinmeyen Ürün',
                  'category': _getCategoryFromProduct(productDetails),
                  'imageUrl': productDetails?['image_url'] ?? '',
                });
              }
            });
          }
        });
        
        setState(() {
          _stockItems = allStockItems;
          _isLoading = false;
        });
      } else {
        setState(() {
          _stockItems = [];
          _isLoading = false;
        });
      }
    } catch (e) {
      _showErrorSnackBar('Stok verileri yüklenirken hata: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  String _getCategoryFromProduct(Map<String, dynamic>? product) {
    if (product == null) return 'diğer';
    
    if (product.containsKey('category')) {
      return product['category'] ?? 'diğer';
    }
    
    if (product.containsKey('image_url')) {
      final imageUrl = product['image_url'];
      if (imageUrl != null && imageUrl.toString().contains('/')) {
        final parts = imageUrl.toString().split('/');
        if (parts.isNotEmpty) {
          final fileName = parts.last;
          if (fileName.contains('-')) {
            return fileName.split('-').first;
          }
        }
      }
    }
    
    return 'diğer';
  }

  void _showErrorSnackBar(String message) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
  }

  List<Map<String, dynamic>> get _filteredStockItems {
    List<Map<String, dynamic>> filtered = _stockItems;
    
    if (_selectedCategory != null && _selectedCategory != 'Tüm Kategoriler') {
      filtered = filtered.where((item) {
        return item['category'] == _selectedCategory;
      }).toList();
    }
    
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((item) {
        return item['productName'].toString().toLowerCase().contains(query) ||
               item['userName'].toString().toLowerCase().contains(query);
      }).toList();
    }
    
    return filtered;
  }

  Future<void> _updateStockItem(String userId, String itemId, int newQuantity) async {
    try {
      await FirebaseDatabase.instance
          .ref('users/$userId/stock_items/$itemId')
          .update({
            'quantity': newQuantity,
            'lastUpdated': DateTime.now().toIso8601String(),
          });
          
      setState(() {
        final index = _stockItems.indexWhere((item) => item['id'] == itemId && item['userId'] == userId);
        if (index != -1) {
          _stockItems[index]['quantity'] = newQuantity;
          _stockItems[index]['lastUpdated'] = DateTime.now().toIso8601String();
        }
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Stok miktarı güncellendi')),
      );
    } catch (e) {
      _showErrorSnackBar('Stok güncellenirken hata: $e');
    }
  }

  Future<void> _deleteStockItem(String userId, String itemId) async {
    try {
      await FirebaseDatabase.instance
          .ref('users/$userId/stock_items/$itemId')
          .remove();
          
      setState(() {
        _stockItems.removeWhere((item) => item['id'] == itemId && item['userId'] == userId);
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Stok ögesi silindi')),
      );
    } catch (e) {
      _showErrorSnackBar('Stok silinirken hata: $e');
    }
  }

  Future<void> _showEditStockDialog(Map<String, dynamic> stockItem) async {
    final quantityController = TextEditingController(text: stockItem['quantity'].toString());
    
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF333333),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Stok Güncelle',
          style: GoogleFonts.montserrat(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ürün: ${stockItem['productName']}',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Kullanıcı: ${stockItem['userName']}',
              style: GoogleFonts.montserrat(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: quantityController,
              style: GoogleFonts.montserrat(color: Colors.white),
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Miktar',
                labelStyle: GoogleFonts.montserrat(color: Colors.grey),
                prefixIcon: const Icon(Icons.inventory, color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF424242),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'İptal',
              style: GoogleFonts.montserrat(color: Colors.grey),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepOrange,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              try {
                final newQuantity = int.parse(quantityController.text);
                _updateStockItem(stockItem['userId'], stockItem['id'], newQuantity);
                Navigator.pop(context);
              } catch (e) {
                _showErrorSnackBar('Geçersiz miktar değeri');
              }
            },
            child: Text('Güncelle', style: GoogleFonts.montserrat()),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF2E2E2E),
      body: Column(
        children: [
          AdminTopbar(
            title: 'Stok Yönetimi',
            actions: [
              SizedBox(
                width: 250,
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                  style: GoogleFonts.montserrat(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Stok ara...',
                    hintStyle: GoogleFonts.montserrat(color: Colors.grey),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: const Color(0xFF424242),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(30),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list, color: Colors.white),
                offset: const Offset(0, 40),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                color: const Color(0xFF424242),
                itemBuilder: (context) => _categories.map(
                  (category) => PopupMenuItem<String>(
                    value: category == 'Tüm Kategoriler' ? null : category,
                    child: Text(
                      category,
                      style: GoogleFonts.montserrat(color: Colors.white),
                    ),
                  ),
                ).toList(),
                onSelected: (value) {
                  setState(() {
                    _selectedCategory = value;
                  });
                },
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _loadStockData,
                tooltip: 'Yenile',
                color: Colors.white,
              ),
            ],
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    color: const Color(0xFF333333),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Stok Özeti',
                            style: GoogleFonts.montserrat(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _buildSummaryCard(
                                title: 'Toplam Öğe',
                                value: _stockItems.length.toString(),
                                icon: Icons.inventory_2,
                              ),
                              const SizedBox(width: 16),
                              _buildSummaryCard(
                                title: 'Toplam Miktar',
                                value: _stockItems.fold<int>(0, (sum, item) => sum + ((item['quantity'] ?? 0) as int)).toString(),
                                icon: Icons.add_shopping_cart,
                              ),
                              const SizedBox(width: 16),
                              _buildSummaryCard(
                                title: 'Kullanıcılar',
                                value: _stockItems.map((item) => item['userId']).toSet().length.toString(),
                                icon: Icons.people,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: AdminTable<Map<String, dynamic>>(
                      columns: const ['Ürün', 'Kullanıcı', 'Miktar', 'Kategori', 'İşlemler'],
                      data: _filteredStockItems,
                      isLoading: _isLoading,
                      cellBuilder: (stockItem, index) => [
                        DataCell(
                          Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: SizedBox(
                                  width: 40,
                                  height: 40,
                                  child: stockItem['imageUrl'] != null && stockItem['imageUrl'].toString().isNotEmpty
                                      ? Image.network(
                                          stockItem['imageUrl'],
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) =>
                                              Container(
                                            color: Colors.grey[700],
                                            child: const Icon(Icons.image, color: Colors.white),
                                          ),
                                        )
                                      : Container(
                                          color: Colors.grey[700],
                                          child: const Icon(Icons.image, color: Colors.white),
                                        ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Flexible(
                                child: Text(
                                  stockItem['productName'],
                                  style: GoogleFonts.montserrat(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        DataCell(Text(
                          stockItem['userName'],
                          style: GoogleFonts.montserrat(color: Colors.white),
                        )),
                        DataCell(
                          Text(
                            stockItem['quantity'].toString(),
                            style: GoogleFonts.montserrat(
                              fontWeight: FontWeight.w600,
                              color: stockItem['quantity'] > 0 ? Colors.green : Colors.red,
                            ),
                          ),
                        ),
                        DataCell(
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.blue.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              stockItem['category'],
                              style: GoogleFonts.montserrat(
                                fontSize: 12,
                                color: Colors.blue,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                        DataCell(
                          ActionCell(
                            actions: [
                              ActionItem(
                                icon: Icons.edit,
                                onPressed: () => _showEditStockDialog(stockItem),
                                tooltip: 'Düzenle',
                                color: Colors.amber,
                              ),
                              ActionItem(
                                icon: Icons.delete,
                                onPressed: () {
                                  showDialog(
                                    context: context,
                                    builder: (context) => AlertDialog(
                                      backgroundColor: const Color(0xFF333333),
                                      title: Text(
                                        'Stok Öğesini Sil',
                                        style: GoogleFonts.montserrat(color: Colors.white),
                                      ),
                                      content: Text(
                                        '${stockItem['productName']} ürününün stok kaydını silmek istediğinizden emin misiniz?',
                                        style: GoogleFonts.montserrat(color: Colors.white70),
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(context),
                                          child: Text(
                                            'İptal',
                                            style: GoogleFonts.montserrat(color: Colors.grey),
                                          ),
                                        ),
                                        TextButton(
                                          onPressed: () {
                                            _deleteStockItem(stockItem['userId'], stockItem['id']);
                                            Navigator.pop(context);
                                          },
                                          child: Text(
                                            'Evet, Sil',
                                            style: GoogleFonts.montserrat(color: Colors.red),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                                tooltip: 'Sil',
                                color: Colors.red,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF3A3A3A),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.deepOrange.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: Colors.deepOrange, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.montserrat(
                      fontSize: 12,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: GoogleFonts.montserrat(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
} 