import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import '../widgets/app_bottom_nav.dart';
import '../providers/cart_provider.dart';
import '../services/order_service.dart';
import '../models/order_model.dart';
import 'product_list.dart';
import 'cart_screen.dart';
import 'stock_screen.dart';
import 'profile_screen.dart';
import 'recipes_screen.dart';
import 'nutrition_screen.dart';
import 'favorites_screen.dart';
import 'dietary_preferences_screen.dart';
import '../widgets/global_ai_assistant.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _userName = '';
  List<OrderModel> _recentOrders = [];
  bool _ordersLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
    _loadRecentOrders();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _userName = prefs.getString('userName') ?? prefs.getString('name') ?? '';
    });
  }

  Future<void> _loadRecentOrders() async {
    try {
      final orders = await OrderService().fetchOrdersHttp();
      if (!mounted) return;
      setState(() {
        _recentOrders = orders.take(3).toList();
        _ordersLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _ordersLoading = false);
    }
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(isDark),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                const SizedBox(height: 20),
                _buildQuickActions(context, isDark),
                const SizedBox(height: 24),
                _buildRecentOrders(isDark),
                const SizedBox(height: 24),
                _buildFeatureCards(context, isDark),
                const SizedBox(height: 24),
              ]),
            ),
          ),
        ],
      ),
      floatingActionButton: const AiFab(),
      bottomNavigationBar: AppBottomNav(
        current: AppNavIndex.home,
        onTap: (index) async {
          if (index == AppNavIndex.home) return;
          if (index == AppNavIndex.products) {
            if (!context.mounted) return;
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const ProductListPage()),
            );
          } else if (index == AppNavIndex.cart) {
            if (!context.mounted) return;
            await Navigator.push<void>(
              context,
              MaterialPageRoute(builder: (_) => const CartScreen()),
            );
          } else if (index == AppNavIndex.stock) {
            if (!context.mounted) return;
            await Navigator.push<void>(
              context,
              MaterialPageRoute(builder: (_) => StockScreen()),
            );
          } else if (index == AppNavIndex.profile) {
            if (!context.mounted) return;
            await Navigator.push<void>(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen(inPanel: false)),
            );
          }
        },
      ),
    );
  }

  Widget _buildSliverAppBar(bool isDark) {
    return SliverAppBar(
      expandedHeight: 180,
      pinned: true,
      automaticallyImplyLeading: false,
      backgroundColor: isDark ? AppTheme.darkSurface : Colors.white,
      surfaceTintColor: Colors.transparent,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: AppTheme.primaryGradient,
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.shopping_basket_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                      const Spacer(),
                      _buildAppBarActions(),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '${_greeting()}${_userName.isNotEmpty ? ', $_userName' : ''}!',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Bugün ne yapmak istersiniz?',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      title: Padding(
        padding: const EdgeInsets.only(left: 4),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shopping_basket_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 8),
            const Text('Online Market', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
      actions: [_buildAppBarActions()],
    );
  }

  Widget _buildAppBarActions() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Consumer<CartProvider>(
          builder: (_, cart, __) => Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined, color: Colors.white),
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
                    decoration: BoxDecoration(
                      color: AppTheme.errorColor,
                      shape: BoxShape.circle,
                    ),
                    child: Text('${cart.itemCount}',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                  ),
                ),
            ],
          ),
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.white),
          onSelected: (value) {
            switch (value) {
              case 'favorites':
                Navigator.push(context, MaterialPageRoute(builder: (_) => const FavoritesScreen()));
                break;
              case 'recipes':
                Navigator.push(context, MaterialPageRoute(builder: (_) => const RecipesScreen()));
                break;
              case 'nutrition':
                Navigator.push(context, MaterialPageRoute(builder: (_) => const NutritionScreen()));
                break;
              case 'diet':
                Navigator.push(context, MaterialPageRoute(builder: (_) => const DietaryPreferencesScreen()));
                break;
            }
          },
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'favorites', child: Row(children: [Icon(Icons.favorite_outline, size: 18), SizedBox(width: 8), Text('Favorilerim')])),
            PopupMenuItem(value: 'recipes', child: Row(children: [Icon(Icons.restaurant_outlined, size: 18), SizedBox(width: 8), Text('Tarifler')])),
            PopupMenuItem(value: 'nutrition', child: Row(children: [Icon(Icons.monitor_heart_outlined, size: 18), SizedBox(width: 8), Text('Beslenme')])),
            PopupMenuDivider(),
            PopupMenuItem(value: 'diet', child: Row(children: [Icon(Icons.tune_outlined, size: 18), SizedBox(width: 8), Text('Diyet Tercihleri')])),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, bool isDark) {
    final actions = [
      _QuickAction(icon: Icons.store_rounded, label: 'Alışveriş\nYap', gradient: AppTheme.primaryGradient,
          onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ProductListPage()))),
      _QuickAction(icon: Icons.inventory_2_rounded, label: 'Stok\nEkle', gradient: AppTheme.secondaryGradient,
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => StockScreen()))),
      _QuickAction(icon: Icons.restaurant_rounded, label: 'Tarif\nBul', gradient: AppTheme.warmGradient,
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RecipesScreen()))),
      _QuickAction(icon: Icons.person_rounded, label: 'Profil', gradient: AppTheme.coolGradient,
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen(inPanel: false)))),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Hızlı Erişim', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Row(
          children: actions.map((a) => Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: _QuickActionCard(action: a, isDark: isDark),
            ),
          )).toList(),
        ),
      ],
    );
  }

  Widget _buildRecentOrders(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Son Siparişler', style: Theme.of(context).textTheme.titleMedium),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen(inPanel: false)),
              ),
              child: const Text('Tümü'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_ordersLoading)
          const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
        else if (_recentOrders.isEmpty)
          _buildEmptyOrders(isDark)
        else
          ...(_recentOrders.map((order) => _buildOrderCard(order, isDark))),
      ],
    );
  }

  Widget _buildEmptyOrders(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.receipt_long_outlined,
                size: 40, color: isDark ? const Color(0xFF475569) : Colors.grey[300]),
            const SizedBox(height: 8),
            Text('Henüz sipariş yok',
                style: TextStyle(color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500])),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(OrderModel order, bool isDark) {
    final statusColor = AppTheme.getStatusColor(order.status ?? 'pending');
    final statusLabel = AppTheme.getStatusLabel(order.status ?? 'pending');
    final date = DateTime.fromMillisecondsSinceEpoch(order.timestamp);
    final dateStr = '${date.day}.${date.month}.${date.year}';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.receipt_outlined, color: statusColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Sipariş #${order.orderNumber}',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 2),
                Text(dateStr,
                    style: TextStyle(
                        fontSize: 12,
                        color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500])),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(statusLabel,
                    style: TextStyle(
                        color: statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700)),
              ),
              const SizedBox(height: 4),
              Text('₺${order.totalPrice.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCards(BuildContext context, bool isDark) {
    final features = [
      _FeatureCard(
        icon: Icons.inventory_2_rounded,
        title: 'Stok Yönetimi',
        subtitle: 'Alışverişlerini takip et',
        gradient: AppTheme.secondaryGradient,
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => StockScreen())),
      ),
      _FeatureCard(
        icon: Icons.restaurant_rounded,
        title: 'AI Tarifler',
        subtitle: 'Stoğuna göre tarif öner',
        gradient: AppTheme.warmGradient,
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RecipesScreen())),
      ),
      _FeatureCard(
        icon: Icons.monitor_heart_rounded,
        title: 'Beslenme Analizi',
        subtitle: 'Besin değerlerini incele',
        gradient: AppTheme.coolGradient,
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NutritionScreen())),
      ),
      _FeatureCard(
        icon: Icons.favorite_rounded,
        title: 'Favorilerim',
        subtitle: 'Beğendiğin ürünler',
        gradient: AppTheme.pinkGradient,
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FavoritesScreen())),
      ),
      _FeatureCard(
        icon: Icons.tune_rounded,
        title: 'Diyet Tercihleri',
        subtitle: 'Beslenme alışkanlıkların',
        gradient: AppTheme.primaryGradient,
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DietaryPreferencesScreen())),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Özellikler', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        ...features.map((f) => _FeatureCardWidget(card: f, isDark: isDark)),
      ],
    );
  }
}

// ----------------------------------------------------------------
// Helper data classes & widgets
// ----------------------------------------------------------------

class _QuickAction {
  final IconData icon;
  final String label;
  final LinearGradient gradient;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.gradient, required this.onTap});
}

class _QuickActionCard extends StatelessWidget {
  final _QuickAction action;
  final bool isDark;
  const _QuickActionCard({required this.action, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: action.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkCardColor : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: action.gradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(action.icon, color: Colors.white, size: 22),
            ),
            const SizedBox(height: 8),
            Text(
              action.label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                height: 1.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureCard {
  final IconData icon;
  final String title;
  final String subtitle;
  final LinearGradient gradient;
  final VoidCallback onTap;
  const _FeatureCard({required this.icon, required this.title, required this.subtitle, required this.gradient, required this.onTap});
}

class _FeatureCardWidget extends StatelessWidget {
  final _FeatureCard card;
  final bool isDark;
  const _FeatureCardWidget({required this.card, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: card.onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkCardColor : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: card.gradient,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(card.icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(card.title,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(card.subtitle,
                      style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500])),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 16,
              color: isDark ? const Color(0xFF475569) : Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }
}
