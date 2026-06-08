import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/analysis_service.dart';
import '../services/stock_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_bottom_nav.dart';
import '../providers/cart_provider.dart';
import 'package:provider/provider.dart';
import 'dashboard_screen.dart';
import 'product_list.dart';
import 'cart_screen.dart';
import 'stock_screen.dart';
import 'profile_screen.dart';

class RecipesScreen extends StatefulWidget {
  const RecipesScreen({super.key});

  @override
  State<RecipesScreen> createState() => _RecipesScreenState();
}

class _RecipesScreenState extends State<RecipesScreen> {
  static const _mealTypes = [
    {'key': 'breakfast', 'label': 'Kahvaltı', 'icon': Icons.free_breakfast_outlined},
    {'key': 'lunch', 'label': 'Öğle', 'icon': Icons.lunch_dining_outlined},
    {'key': 'dinner', 'label': 'Akşam', 'icon': Icons.dinner_dining_outlined},
    {'key': 'snack', 'label': 'Atıştırmalık', 'icon': Icons.cookie_outlined},
  ];

  String _selectedMealType = 'breakfast';
  String? _result;
  bool _loading = false;
  String? _error;

  Future<void> _suggest() async {
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('uid') ?? prefs.getString('userId') ?? '';
      String suggestion;
      switch (_selectedMealType) {
        case 'breakfast':
          suggestion = await AnalysisService.breakfastSuggestion(
            userId: userId, recipeType: 'balanced');
          break;
        case 'dinner':
          suggestion = await AnalysisService.dinnerSuggestion(
            userId: userId, suggestionType: 'balanced');
          break;
        case 'snack':
          suggestion = await AnalysisService.snackSuggestion(
            userId: userId, snackType: 'healthy');
          break;
        default:
          final stockItems = await StockService.fetchUserStock();
          final names = stockItems.map((i) => i['name'].toString()).toList();
          suggestion = await AnalysisService.suggestRecipe(names);
      }
      if (mounted) setState(() { _result = suggestion; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Tarif Önerileri'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              gradient: AppTheme.warmGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.auto_awesome, color: Colors.white, size: 14),
                SizedBox(width: 4),
                Text('AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildMealTypeSelector(isDark),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _result != null
                    ? _buildResult(isDark)
                    : _buildEmpty(isDark),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _loading ? null : _suggest,
        label: const Text('Tarif Öner'),
        icon: const Icon(Icons.restaurant_rounded),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
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

  Widget _buildMealTypeSelector(bool isDark) {
    return Container(
      height: 56,
      color: isDark ? AppTheme.darkSurface : Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _mealTypes.length,
        itemBuilder: (_, i) {
          final type = _mealTypes[i];
          final isSelected = _selectedMealType == type['key'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedMealType = type['key'] as String),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  gradient: isSelected ? AppTheme.warmGradient : null,
                  color: isSelected ? null : (isDark ? AppTheme.darkCardColor : const Color(0xFFF1F5F9)),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(type['icon'] as IconData,
                        size: 16,
                        color: isSelected ? Colors.white
                            : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                    const SizedBox(width: 6),
                    Text(type['label'] as String,
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isSelected ? Colors.white
                                : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)))),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmpty(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: AppTheme.warmGradient,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.restaurant_rounded, color: Colors.white, size: 40),
            ),
            const SizedBox(height: 20),
            Text('Tarif Önerisi Al',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Stoğundaki malzemelere göre yapay zeka\nsana özel tarifler önerir.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 14,
                  color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500]),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!,
                  style: const TextStyle(color: AppTheme.errorColor, fontSize: 13)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildResult(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppTheme.darkCardColor : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: AppTheme.warmGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.restaurant_rounded, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 10),
                const Text('Tarif Önerisi',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const Spacer(),
                TextButton.icon(
                  onPressed: _suggest,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Yenile'),
                ),
              ],
            ),
            const Divider(height: 20),
            MarkdownBody(data: _result ?? ''),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final cartProvider = context.read<CartProvider>();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Malzemeleri sepete eklemek için ürünler sayfasını kullan')),
                  );
                },
                icon: const Icon(Icons.shopping_cart_outlined),
                label: const Text('Sepete Ekle'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
