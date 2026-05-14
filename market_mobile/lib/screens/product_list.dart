import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:async';
import '../widgets/product_card.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../providers/cart_provider.dart';
import 'package:provider/provider.dart';
import 'cart_screen.dart';
import 'profile_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'stock_screen.dart';
import '../theme/app_theme.dart';
import '../constants/api_constants.dart';
import '../theme/theme_mode_holder.dart';
import 'dietary_preferences_screen.dart';

/// Uygulama genelinde kullanılan kategori listesi
const List<Map<String, dynamic>> kCategories = [
  {"key": "meyve_sebze", "title": "Meyve & Sebze", "icon": Icons.eco_outlined},
  {"key": "et_tavuk", "title": "Et & Tavuk", "icon": Icons.kebab_dining_outlined},
  {"key": "sut_urunleri", "title": "Süt Ürünleri", "icon": Icons.water_drop_outlined},
  {"key": "icecekler", "title": "İçecekler", "icon": Icons.local_drink_outlined},
  {"key": "atistirmalik", "title": "Atıştırmalık", "icon": Icons.cookie_outlined},
  {"key": "temizlik", "title": "Temizlik", "icon": Icons.cleaning_services_outlined},
];

class ProductListPage extends StatefulWidget {
  const ProductListPage({super.key});

  @override
  State<ProductListPage> createState() => _ProductListPageState();
}

class _ProductListPageState extends State<ProductListPage> {
  List<dynamic> _products = [];
  String _selectedCategory = "meyve_sebze";
  String? _token;
  bool _isLoading = false;
  int _currentNavIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadTokenAndFetch();
  }

  Future<void> _loadTokenAndFetch() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() => _token = prefs.getString('token'));
    fetchProducts();
  }

  Future<void> fetchProducts() async {
    if (_token == null) return;
    setState(() => _isLoading = true);
    try {
      final url = Uri.parse('${getBaseUrl()}${ApiPaths.products}/').replace(
        queryParameters: {'category': _selectedCategory},
      );
      final response = await http.get(url, headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_token',
      }).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List<dynamic> list =
            decoded is List ? decoded : (decoded['products'] as List<dynamic>? ?? []);
        if (mounted) setState(() => _products = list);
      } else {
        if (mounted) setState(() => _products = []);
      }
    } catch (e) {
      if (mounted) setState(() => _products = []);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSidePanel(BuildContext context, Widget child) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: "Kapat",
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 280),
      pageBuilder: (context, anim1, anim2) => Align(
        alignment: Alignment.centerRight,
        child: Material(
          color: Colors.transparent,
          child: Container(
            width: 420,
            height: double.infinity,
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              boxShadow: [
                BoxShadow(color: Colors.black26, blurRadius: 32, offset: const Offset(-4, 0)),
              ],
            ),
            child: SafeArea(child: child),
          ),
        ),
      ),
      transitionBuilder: (ctx, anim1, anim2, child) => SlideTransition(
        position: Tween(begin: const Offset(1, 0), end: Offset.zero)
            .animate(CurvedAnimation(parent: anim1, curve: Curves.easeOut)),
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return kIsWeb ? _buildWebLayout() : _buildMobileLayout();
  }

  // -------------------------------------------------------
  // WEB LAYOUT
  // -------------------------------------------------------
  Widget _buildWebLayout() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 72,
        title: Row(
          children: [
            // Logo
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.shopping_basket_rounded, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 12),
            const Text('Online Market', style: TextStyle(fontWeight: FontWeight.w800)),
            const Spacer(),
            PopupMenuButton<String>(
              tooltip: 'Diğer',
              onSelected: (value) async {
                switch (value) {
                  case 'diet':
                    if (!context.mounted) return;
                    await Navigator.push<void>(
                      context,
                      MaterialPageRoute<void>(builder: (_) => const DietaryPreferencesScreen()),
                    );
                    break;
                  case 'theme_light':
                    await setAppThemeMode(ThemeMode.light);
                    break;
                  case 'theme_dark':
                    await setAppThemeMode(ThemeMode.dark);
                    break;
                  case 'theme_system':
                    await setAppThemeMode(ThemeMode.system);
                    break;
                }
              },
              itemBuilder: (ctx) => const [
                PopupMenuItem(value: 'diet', child: Text('Diyet tercihleri')),
                PopupMenuDivider(),
                PopupMenuItem(value: 'theme_light', child: Text('Açık tema')),
                PopupMenuItem(value: 'theme_dark', child: Text('Koyu tema')),
                PopupMenuItem(value: 'theme_system', child: Text('Sistem teması')),
              ],
            ),
            // Profil
            IconButton(
              icon: const Icon(Icons.account_circle_outlined),
              onPressed: () => _showSidePanel(context, const ProfileScreen(inPanel: true)),
            ),
            // Sepet
            Consumer<CartProvider>(
              builder: (_, cart, __) => Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_cart_outlined),
                    onPressed: () => _showSidePanel(context, const CartScreen()),
                  ),
                  if (cart.itemCount > 0)
                    Positioned(
                      right: 4,
                      top: 4,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          shape: BoxShape.circle,
                        ),
                        child: Text('${cart.itemCount}',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(
            height: 1,
            color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
          ),
        ),
      ),
      body: Row(
        children: [
          // Sol kategori menüsü
          Container(
            width: 240,
            decoration: BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                  child: Text(
                    'KATEGORİLER',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    ),
                  ),
                ),
                ...kCategories.map((cat) {
                  final isSelected = _selectedCategory == cat["key"];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                    child: ListTile(
                      dense: true,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      tileColor: isSelected
                          ? AppTheme.primaryColor.withValues(alpha: 0.1)
                          : Colors.transparent,
                      leading: Icon(
                        cat["icon"] as IconData,
                        size: 20,
                        color: isSelected ? AppTheme.primaryColor
                            : (isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8)),
                      ),
                      title: Text(
                        cat["title"]!,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? AppTheme.primaryColor
                              : (isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A)),
                        ),
                      ),
                      onTap: () {
                        setState(() => _selectedCategory = cat["key"]!);
                        fetchProducts();
                      },
                    ),
                  );
                }),
              ],
            ),
          ),
          // Sağ ürün grid
          Expanded(child: _buildProductGrid(isWeb: true)),
        ],
      ),
    );
  }

  // -------------------------------------------------------
  // MOBİL LAYOUT
  // -------------------------------------------------------
  Widget _buildMobileLayout() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        toolbarHeight: 64,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.shopping_basket_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Online Market'),
          ],
        ),
        actions: [
          Consumer<CartProvider>(
            builder: (_, cart, __) => Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  icon: const Icon(Icons.shopping_cart_outlined),
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CartScreen()),
                  ),
                ),
                if (cart.itemCount > 0)
                  Positioned(
                    right: 4,
                    top: 4,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        gradient: AppTheme.primaryGradient,
                        shape: BoxShape.circle,
                      ),
                      child: Text('${cart.itemCount}',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                    ),
                  ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            tooltip: 'Diğer',
            onSelected: (value) async {
              switch (value) {
                case 'diet':
                  if (!context.mounted) return;
                  await Navigator.push<void>(
                    context,
                    MaterialPageRoute<void>(builder: (_) => const DietaryPreferencesScreen()),
                  );
                  break;
                case 'theme_light':
                  await setAppThemeMode(ThemeMode.light);
                  break;
                case 'theme_dark':
                  await setAppThemeMode(ThemeMode.dark);
                  break;
                case 'theme_system':
                  await setAppThemeMode(ThemeMode.system);
                  break;
              }
            },
            itemBuilder: (ctx) => const [
              PopupMenuItem(value: 'diet', child: Text('Diyet tercihleri')),
              PopupMenuDivider(),
              PopupMenuItem(value: 'theme_light', child: Text('Açık tema')),
              PopupMenuItem(value: 'theme_dark', child: Text('Koyu tema')),
              PopupMenuItem(value: 'theme_system', child: Text('Sistem teması')),
            ],
          ),
          const SizedBox(width: 4),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(height: 1,
            color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
        ),
      ),
      body: Column(
        children: [
          // Kategori kaydırma çubuğu
          Container(
            height: 52,
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkSurface : Colors.white,
              border: Border(
                bottom: BorderSide(
                  color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
                ),
              ),
            ),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: kCategories.length,
              itemBuilder: (ctx, i) {
                final cat = kCategories[i];
                final isSelected = _selectedCategory == cat["key"];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedCategory = cat["key"]!);
                      fetchProducts();
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: isSelected ? AppTheme.primaryGradient : null,
                        color: isSelected ? null
                            : (isDark ? AppTheme.darkCardColor : const Color(0xFFF1F5F9)),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: isSelected
                            ? [BoxShadow(
                                color: AppTheme.primaryColor.withValues(alpha: 0.35),
                                blurRadius: 8, offset: const Offset(0, 3))]
                            : [],
                      ),
                      child: Text(
                        cat["title"]!,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? Colors.white
                              : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          // Ürün ızgarası
          Expanded(child: _buildProductGrid(isWeb: false)),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(isDark),
    );
  }

  Widget _buildBottomNav(bool isDark) {
    final cartCount = context.watch<CartProvider>().itemCount;
    final primary = isDark ? AppTheme.primaryDarkColor : AppTheme.primaryColor;
    final muted = isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8);

    return SafeArea(
      top: false,
      child: NavigationBarTheme(
        data: NavigationBarThemeData(
          height: 68,
          indicatorColor: primary.withValues(alpha: 0.14),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? primary : muted,
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return IconThemeData(color: selected ? primary : muted, size: 24);
          }),
        ),
        child: NavigationBar(
        selectedIndex: _currentNavIndex,
        backgroundColor: isDark ? AppTheme.darkSurface : Colors.white,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black26,
        elevation: isDark ? 0 : 6,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        onDestinationSelected: (index) async {
          if (index == 0) {
            setState(() => _currentNavIndex = 0);
            return;
          }
          setState(() => _currentNavIndex = index);
          if (index == 1) {
            await Navigator.push<void>(
              context,
              MaterialPageRoute<void>(builder: (_) => StockScreen()),
            );
          } else if (index == 2) {
            await Navigator.push<void>(
              context,
              MaterialPageRoute<void>(builder: (_) => const CartScreen()),
            );
          } else if (index == 3) {
            await Navigator.push<void>(
              context,
              MaterialPageRoute<void>(builder: (_) => const ProfileScreen(inPanel: false)),
            );
          }
          if (mounted) setState(() => _currentNavIndex = 0);
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.store_outlined),
            selectedIcon: Icon(Icons.store_rounded),
            label: 'Mağaza',
          ),
          const NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2_rounded),
            label: 'Stoğum',
          ),
          NavigationDestination(
            icon: _CartNavIcon(outlined: true, count: cartCount),
            selectedIcon: _CartNavIcon(outlined: false, count: cartCount),
            label: 'Sepet',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profil',
          ),
        ],
        ),
      ),
    );
  }

  Widget _buildProductGrid({required bool isWeb}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor),
        ),
      );
    }
    if (_products.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shopping_bag_outlined, size: 64,
              color: isDark ? const Color(0xFF334155) : Colors.grey[300]),
            const SizedBox(height: 16),
            Text('Bu kategoride ürün bulunamadı',
              style: TextStyle(
                color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                fontSize: 15,
              )),
          ],
        ),
      );
    }
    return Padding(
      padding: EdgeInsets.all(isWeb ? 24 : 12),
      child: LayoutBuilder(
        builder: (ctx, constraints) {
          int crossAxisCount;
          if (isWeb) {
            crossAxisCount = constraints.maxWidth > 1200 ? 4 : constraints.maxWidth > 900 ? 3 : 2;
          } else {
            crossAxisCount = 2;
          }
          return GridView.builder(
            itemCount: _products.length,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              crossAxisSpacing: isWeb ? 20 : 12,
              mainAxisSpacing: isWeb ? 20 : 12,
              childAspectRatio: 3 / 4.2,
            ),
            itemBuilder: (ctx, index) {
              final p = _products[index];
              return ProductCard(
                id: p["id"] ?? p["_id"] ?? p["name"],
                imageUrl: p["image_url"] ?? '',
                name: p["name"] ?? '',
                price: (p["price"] as num).toDouble(),
                stock: p["stock"] ?? 0,
                category: p["category"] ?? _selectedCategory,
              );
            },
          );
        },
      ),
    );
  }
}

/// Sepet sekmesi için rozetli ikon (Material NavigationBar ile uyumlu).
class _CartNavIcon extends StatelessWidget {
  final bool outlined;
  final int count;

  const _CartNavIcon({required this.outlined, required this.count});

  @override
  Widget build(BuildContext context) {
    final icon = Icon(
      outlined ? Icons.shopping_cart_outlined : Icons.shopping_cart_rounded,
      size: 24,
    );
    if (count <= 0) return icon;
    final label = count > 99 ? '99+' : '$count';
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        icon,
        Positioned(
          right: -8,
          top: -6,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
            decoration: const BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.all(Radius.circular(10)),
            ),
            child: Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
            ),
          ),
        ),
      ],
    );
  }
}
