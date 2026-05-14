import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';

class ProductCard extends StatelessWidget {
  final String id;
  final String imageUrl;
  final String name;
  final double price;
  final int stock;
  final String? unit;
  final String? label;
  final String category;

  const ProductCard({
    super.key,
    required this.id,
    required this.imageUrl,
    required this.name,
    required this.price,
    required this.stock,
    this.unit = 'adet',
    this.label,
    this.category = 'all',
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cartProvider = context.watch<CartProvider>();
    final cartQty = cartProvider.getItemQuantity(id);
    final isOutOfStock = stock < 1;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
        ),
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
            // Ürün görseli
            Expanded(
              flex: 3,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: isDark
                            ? const Color(0xFF1E293B)
                            : const Color(0xFFF1F5F9),
                        child: Center(
                          child: Icon(
                            Icons.image_not_supported_outlined,
                            color: isDark ? const Color(0xFF475569) : Colors.grey[300],
                            size: 36,
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Stok bitti etiketi
                  if (isOutOfStock)
                    Positioned.fill(
                      child: Container(
                        color: Colors.black.withValues(alpha: 0.5),
                        child: const Center(
                          child: Text(
                            'Stok\nBitti',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  // Sepetteki adet rozeti
                  if (cartQty > 0)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withValues(alpha: 0.4),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Text(
                          '$cartQty',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Alt bilgi bölümü
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '₺${price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: AppTheme.primaryColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        // Sepet butonu
                        _AddToCartButton(
                          isOutOfStock: isOutOfStock,
                          cartQty: cartQty,
                          onAdd: () {
                            context.read<CartProvider>().addItem(
                              id, name, price, imageUrl,
                              stock: stock, unit: unit, label: label, category: category,
                            );
                          },
                          onRemove: () {
                            context.read<CartProvider>().removeSingleItem(id);
                          },
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

class _AddToCartButton extends StatelessWidget {
  final bool isOutOfStock;
  final int cartQty;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  const _AddToCartButton({
    required this.isOutOfStock,
    required this.cartQty,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    if (isOutOfStock) {
      return const SizedBox(
        width: 32,
        height: 32,
        child: Icon(Icons.remove_shopping_cart_outlined, color: Colors.grey, size: 18),
      );
    }
    if (cartQty > 0) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _SmallIconBtn(icon: Icons.remove, onTap: onRemove, isDanger: true),
          const SizedBox(width: 2),
          _SmallIconBtn(icon: Icons.add, onTap: onAdd),
        ],
      );
    }
    return GestureDetector(
      onTap: onAdd,
      child: Container(
        width: 32,
        height: 32,
        decoration: const BoxDecoration(
          gradient: AppTheme.primaryGradient,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.add, color: Colors.white, size: 18),
      ),
    );
  }
}

class _SmallIconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isDanger;

  const _SmallIconBtn({required this.icon, required this.onTap, this.isDanger = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: isDanger
              ? const Color(0xFFFEE2E2)
              : AppTheme.primaryColor.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 16,
          color: isDanger ? AppTheme.errorColor : AppTheme.primaryColor,
        ),
      ),
    );
  }
}
