import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/product.dart';
import 'widgets/admin_topbar.dart';
import 'widgets/admin_table.dart';
import '../constants/constants.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class AdminProductManagement extends StatefulWidget {
  const AdminProductManagement({Key? key}) : super(key: key);

  @override
  State<AdminProductManagement> createState() => _AdminProductManagementState();
}

class _AdminProductManagementState extends State<AdminProductManagement> {
  bool _isLoading = true;
  List<Product> _products = [];
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
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final apiUrl = Uri.parse('${getBaseUrl()}${ApiPaths.products}');
      final response = await http.get(apiUrl);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          _products = data.map((json) => Product.fromJson(json)).toList();
          _isLoading = false;
        });
      } else {
        _showErrorSnackBar('Ürünler yüklenemedi. Status: ${response.statusCode}');
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      _showErrorSnackBar('Ürünler yüklenemedi: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  List<Product> get _filteredProducts {
    List<Product> filtered = _products;
    
    if (_selectedCategory != null && _selectedCategory != 'Tüm Kategoriler') {
      filtered = filtered.where((product) {
        final category = product.imageUrl.contains('/') 
            ? product.imageUrl.split('/').last.split('-').first 
            : '';
        return category == _selectedCategory;
      }).toList();
    }
    
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((product) {
        return product.name.toLowerCase().contains(query);
      }).toList();
    }
    
    return filtered;
  }

  Future<void> _updateProduct(String id, Map<String, dynamic> data) async {
    try {
      final apiUrl = Uri.parse('${getBaseUrl()}${ApiPaths.products}/$id');
      final response = await http.put(
        apiUrl,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(data),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ürün başarıyla güncellendi')),
        );
        _loadProducts(); // Ürünleri yeniden yükle
      } else {
        _showErrorSnackBar('Güncelleme başarısız oldu. Status: ${response.statusCode}');
      }
    } catch (e) {
      _showErrorSnackBar('Güncelleme hatası: $e');
    }
  }

  Future<void> _deleteProduct(String id) async {
    try {
      final apiUrl = Uri.parse('${getBaseUrl()}${ApiPaths.products}/$id');
      final response = await http.delete(apiUrl);

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ürün başarıyla silindi')),
        );
        _loadProducts(); // Ürünleri yeniden yükle
      } else {
        _showErrorSnackBar('Silme işlemi başarısız oldu. Status: ${response.statusCode}');
      }
    } catch (e) {
      _showErrorSnackBar('Silme hatası: $e');
    }
  }

  Future<void> _showEditProductDialog(Product product) async {
    final nameController = TextEditingController(text: product.name);
    final priceController = TextEditingController(text: product.price.toString());
    final stockController = TextEditingController(text: product.stock.toString());
    final imageUrlController = TextEditingController(text: product.imageUrl);
    
    // Ürün kategorisini URL'den tespit et
    String currentCategory = 'meyve_sebze'; // Varsayılan kategori
    if (product.imageUrl.contains('/')) {
      final imagePath = product.imageUrl.split('/').last;
      if (imagePath.contains('-')) {
        currentCategory = imagePath.split('-').first;
      }
    }
    
    String selectedCategory = currentCategory;
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF333333),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Ürün Düzenle',
            style: GoogleFonts.montserrat(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTextField(
                  controller: nameController,
                  label: 'Ürün Adı',
                  icon: Icons.shopping_bag,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: priceController,
                  label: 'Fiyat (₺)',
                  icon: Icons.attach_money,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: stockController,
                  label: 'Stok',
                  icon: Icons.inventory,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: imageUrlController,
                  label: 'Resim URL',
                  icon: Icons.image,
                ),
                const SizedBox(height: 16),
                StatefulBuilder(
                  builder: (context, setState) {
                    return DropdownButtonFormField<String>(
                      value: selectedCategory,
                      decoration: InputDecoration(
                        labelText: 'Kategori',
                        labelStyle: GoogleFonts.montserrat(color: Colors.grey),
                        prefixIcon: const Icon(Icons.category, color: Colors.grey),
                        filled: true,
                        fillColor: const Color(0xFF424242),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      style: GoogleFonts.montserrat(color: Colors.white),
                      dropdownColor: const Color(0xFF424242),
                      items: _categories.sublist(1).map((String category) {
                        return DropdownMenuItem<String>(
                          value: category,
                          child: Text(category),
                        );
                      }).toList(),
                      onChanged: (String? value) {
                        setState(() {
                          selectedCategory = value!;
                        });
                      },
                    );
                  },
                ),
                const SizedBox(height: 24),
                if (product.imageUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      product.imageUrl,
                      height: 100,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          height: 100,
                          width: double.infinity,
                          color: Colors.grey[800],
                          child: const Center(
                            child: Icon(Icons.broken_image, color: Colors.white),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
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
                  final updatedProduct = {
                    'name': nameController.text,
                    'price': double.parse(priceController.text),
                    'stock': int.parse(stockController.text),
                    'image_url': imageUrlController.text,
                    'category': selectedCategory,
                  };

                  _updateProduct(product.id, updatedProduct);
                  Navigator.pop(context);
                } catch (e) {
                  _showErrorSnackBar('Geçersiz giriş değerleri: $e');
                }
              },
              child: Text('Kaydet', style: GoogleFonts.montserrat()),
            ),
          ],
        );
      },
    );
  }

  Future<void> _showAddProductDialog() async {
    final nameController = TextEditingController();
    final priceController = TextEditingController();
    final stockController = TextEditingController();
    final imageUrlController = TextEditingController();
    String selectedCategory = 'meyve_sebze';

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF333333),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Yeni Ürün Ekle',
            style: GoogleFonts.montserrat(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTextField(
                  controller: nameController,
                  label: 'Ürün Adı',
                  icon: Icons.shopping_bag,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: priceController,
                  label: 'Fiyat (₺)',
                  icon: Icons.attach_money,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: stockController,
                  label: 'Stok',
                  icon: Icons.inventory,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: imageUrlController,
                  label: 'Resim URL',
                  icon: Icons.image,
                ),
                const SizedBox(height: 16),
                StatefulBuilder(
                  builder: (context, setState) {
                    return DropdownButtonFormField<String>(
                      value: selectedCategory,
                      decoration: InputDecoration(
                        labelText: 'Kategori',
                        labelStyle: GoogleFonts.montserrat(color: Colors.grey),
                        prefixIcon: const Icon(Icons.category, color: Colors.grey),
                        filled: true,
                        fillColor: const Color(0xFF424242),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      style: GoogleFonts.montserrat(color: Colors.white),
                      dropdownColor: const Color(0xFF424242),
                      items: _categories.sublist(1).map((String category) {
                        return DropdownMenuItem<String>(
                          value: category,
                          child: Text(category),
                        );
                      }).toList(),
                      onChanged: (String? value) {
                        setState(() {
                          selectedCategory = value!;
                        });
                      },
                    );
                  },
                ),
              ],
            ),
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
              onPressed: () async {
                try {
                  final newProduct = {
                    'name': nameController.text,
                    'price': double.parse(priceController.text),
                    'stock': int.parse(stockController.text),
                    'image_url': imageUrlController.text,
                    'category': selectedCategory,
                  };

                  final apiUrl = Uri.parse('${getBaseUrl()}${ApiPaths.products}');
                  final response = await http.post(
                    apiUrl,
                    headers: {'Content-Type': 'application/json'},
                    body: jsonEncode(newProduct),
                  );

                  if (response.statusCode == 201) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Ürün başarıyla eklendi')),
                    );
                    _loadProducts(); // Ürünleri yeniden yükle
                    Navigator.pop(context);
                  } else {
                    _showErrorSnackBar('Ürün eklenemedi. Status: ${response.statusCode}');
                  }
                } catch (e) {
                  _showErrorSnackBar('Geçersiz giriş değerleri: $e');
                }
              },
              child: Text('Ekle', style: GoogleFonts.montserrat()),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      style: GoogleFonts.montserrat(color: Colors.white),
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.montserrat(color: Colors.grey),
        prefixIcon: Icon(icon, color: Colors.grey),
        filled: true,
        fillColor: const Color(0xFF424242),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
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
            title: 'Ürün Yönetimi',
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
                    hintText: 'Ürün ara...',
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
                onPressed: _loadProducts,
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
                  ElevatedButton.icon(
                    onPressed: _showAddProductDialog,
                    icon: const Icon(Icons.add),
                    label: Text(
                      'Yeni Ürün Ekle',
                      style: GoogleFonts.montserrat(),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.deepOrange,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: AdminTable<Product>(
                      columns: const ['Ürün', 'Fiyat', 'Stok', 'Kategori', 'İşlemler'],
                      data: _filteredProducts,
                      isLoading: _isLoading,
                      cellBuilder: (product, index) => [
                        DataCell(
                          Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: SizedBox(
                                  width: 40,
                                  height: 40,
                                  child: product.imageUrl.isEmpty
                                      ? Container(
                                          color: Colors.grey[700],
                                          child: const Icon(Icons.image, color: Colors.white),
                                        )
                                      : Image.network(
                                          product.imageUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) =>
                                              Container(
                                            color: Colors.grey[700],
                                            child: const Icon(Icons.broken_image, color: Colors.white),
                                          ),
                                        ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Flexible(
                                child: Text(
                                  product.name,
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
                          '₺${product.price.toStringAsFixed(2)}',
                          style: GoogleFonts.montserrat(
                            color: Colors.deepOrange,
                            fontWeight: FontWeight.w600,
                          ),
                        )),
                        DataCell(
                          Text(
                            '${product.stock}',
                            style: GoogleFonts.montserrat(
                              color: product.stock > 0 ? Colors.green : Colors.red,
                              fontWeight: FontWeight.w500,
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
                              _getCategoryFromImageUrl(product.imageUrl),
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
                                onPressed: () => _showEditProductDialog(product),
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
                                        'Ürünü Sil',
                                        style: GoogleFonts.montserrat(color: Colors.white),
                                      ),
                                      content: Text(
                                        '${product.name} ürünü silinecek. Onaylıyor musunuz?',
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
                                            _deleteProduct(product.id);
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

  String _getCategoryFromImageUrl(String imageUrl) {
    if (imageUrl.isEmpty) {
      return 'diğer';
    }
    
    try {
      final parts = imageUrl.split('/');
      if (parts.isNotEmpty) {
        final fileName = parts.last;
        if (fileName.contains('-')) {
          return fileName.split('-').first;
        }
      }
    } catch (_) {}
    
    return 'diğer';
  }
} 