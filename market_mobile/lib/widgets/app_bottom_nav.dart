import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';

enum AppNavIndex { home, products, cart, stock, profile }

class AppBottomNav extends StatelessWidget {
  final AppNavIndex current;
  final void Function(AppNavIndex index) onTap;

  const AppBottomNav({
    super.key,
    required this.current,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
          selectedIndex: current.index,
          backgroundColor: isDark ? AppTheme.darkSurface : Colors.white,
          surfaceTintColor: Colors.transparent,
          shadowColor: Colors.black26,
          elevation: isDark ? 0 : 6,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          onDestinationSelected: (i) => onTap(AppNavIndex.values[i]),
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Ana Sayfa',
            ),
            const NavigationDestination(
              icon: Icon(Icons.store_outlined),
              selectedIcon: Icon(Icons.store_rounded),
              label: 'Mağaza',
            ),
            NavigationDestination(
              icon: _CartNavIcon(outlined: true, count: cartCount),
              selectedIcon: _CartNavIcon(outlined: false, count: cartCount),
              label: 'Sepet',
            ),
            const NavigationDestination(
              icon: Icon(Icons.inventory_2_outlined),
              selectedIcon: Icon(Icons.inventory_2_rounded),
              label: 'Stoğum',
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
}

class _CartNavIcon extends StatelessWidget {
  final bool outlined;
  final int count;

  const _CartNavIcon({required this.outlined, required this.count});

  @override
  Widget build(BuildContext context) {
    if (count == 0) {
      return Icon(outlined ? Icons.shopping_cart_outlined : Icons.shopping_cart_rounded);
    }
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(outlined ? Icons.shopping_cart_outlined : Icons.shopping_cart_rounded),
        Positioned(
          right: -6,
          top: -4,
          child: Container(
            padding: const EdgeInsets.all(3),
            decoration: const BoxDecoration(
              gradient: AppTheme.primaryGradient,
              shape: BoxShape.circle,
            ),
            child: Text(
              count > 9 ? '9+' : '$count',
              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
            ),
          ),
        ),
      ],
    );
  }
}
