import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/favorites_provider.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/app_bottom_nav.dart';
import 'dashboard_screen.dart';
import 'product_list.dart';
import 'cart_screen.dart';
import 'stock_screen.dart';
import 'profile_screen.dart';

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final favorites = context.watch<FavoritesProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text('Favorilerim (${favorites.count})'),
        actions: [
          if (favorites.count > 0)
            TextButton(
              onPressed: () => favorites.clear(),
              child: const Text('Temizle'),
            ),
        ],
      ),
      body: favorites.items.isEmpty
          ? _buildEmpty(isDark)
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.72,
              ),
              itemCount: favorites.items.length,
              itemBuilder: (context, index) {
                final item = favorites.items.values.elementAt(index);
                return _FavoriteCard(item: item, isDark: isDark);
              },
            ),
      bottomNavigationBar: AppBottomNav(
        current: AppNavIndex.home,
        onTap: (index) async {
          if (index == AppNavIndex.home) {
            Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
          } else if (index == AppNavIndex.products) {
            Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ProductListPage()));
          } else if (index == AppNavIndex.cart) {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()));
          } else if (index == AppNavIndex.stock) {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => StockScreen()));
          } else if (index == AppNavIndex.profile) {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen(inPanel: false)));
          }
        },
      ),
    );
  }

  Widget _buildEmpty(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.favorite_border_rounded,
              size: 72,
              color: isDark ? const Color(0xFF334155) : Colors.grey[300]),
          const SizedBox(height: 16),
          Text('Henüz favori ürün yok',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500])),
          const SizedBox(height: 8),
          Text('Ürünleri favorilerine ekleyerek\nhızlıca ulaşabilirsin',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 13,
                  color: isDark ? const Color(0xFF64748B) : Colors.grey[400])),
        ],
      ),
    );
  }
}

class _FavoriteCard extends StatelessWidget {
  final FavoriteItem item;
  final bool isDark;

  const _FavoriteCard({required this.item, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final cartProvider = context.watch<CartProvider>();
    final favProvider = context.read<FavoritesProvider>();
    final cartQty = cartProvider.getItemQuantity(item.id);
    final isOutOfStock = item.stock < 1;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Image.network(
                      item.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        child: Icon(Icons.image_not_supported_outlined,
                            color: isDark ? const Color(0xFF475569) : Colors.grey[300], size: 36),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: GestureDetector(
                      onTap: () => favProvider.remove(item.id),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.favorite_rounded,
                            color: Color(0xFFEF4444), size: 18),
                      ),
                    ),
                  ),
                  if (isOutOfStock)
                    Positioned.fill(
                      child: Container(
                        color: Colors.black.withValues(alpha: 0.5),
                        child: const Center(
                          child: Text('Stok\nBitti',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(item.name,
                        style: TextStyle(
                            color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            height: 1.3),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('₺${item.price.toStringAsFixed(2)}',
                            style: const TextStyle(
                                color: AppTheme.primaryColor,
                                fontSize: 14,
                                fontWeight: FontWeight.w800)),
                        if (!isOutOfStock)
                          GestureDetector(
                            onTap: () => context.read<CartProvider>().addItem(
                              item.id, item.name, item.price, item.imageUrl,
                              stock: item.stock, unit: item.unit,
                              label: item.label, category: item.category,
                            ),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: const BoxDecoration(
                                gradient: AppTheme.primaryGradient,
                                shape: BoxShape.circle,
                              ),
                              child: cartQty > 0
                                  ? Center(
                                      child: Text('$cartQty',
                                          style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700)))
                                  : const Icon(Icons.add, color: Colors.white, size: 18),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
