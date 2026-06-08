import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/analysis_service.dart';
import '../theme/app_theme.dart';
import '../widgets/app_bottom_nav.dart';
import 'dashboard_screen.dart';
import 'product_list.dart';
import 'cart_screen.dart';
import 'stock_screen.dart';
import 'profile_screen.dart';

class NutritionScreen extends StatefulWidget {
  const NutritionScreen({super.key});

  @override
  State<NutritionScreen> createState() => _NutritionScreenState();
}

class _NutritionScreenState extends State<NutritionScreen> {
  static const _analysisTypes = [
    {'key': 'overview', 'label': 'Genel Analiz'},
    {'key': 'deficiency', 'label': 'Eksiklikler'},
    {'key': 'balance', 'label': 'Denge'},
  ];

  String _analysisType = 'overview';
  String? _result;
  bool _loading = false;
  String? _error;

  Future<void> _analyze() async {
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('uid') ?? prefs.getString('userId') ?? '';
      final result = await AnalysisService.nutritionAnalysis(
          userId: userId, analysisType: _analysisType);
      if (mounted) setState(() { _result = result; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Beslenme Analizi'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              gradient: AppTheme.coolGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.monitor_heart_outlined, color: Colors.white, size: 14),
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
          _buildTypeSelector(isDark),
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
        onPressed: _loading ? null : _analyze,
        label: const Text('Analiz Et'),
        icon: const Icon(Icons.bar_chart_rounded),
        backgroundColor: const Color(0xFF3B82F6),
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

  Widget _buildTypeSelector(bool isDark) {
    return Container(
      color: isDark ? AppTheme.darkSurface : Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: _analysisTypes.map((type) {
          final isSelected = _analysisType == type['key'];
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: GestureDetector(
                onTap: () => setState(() => _analysisType = type['key'] as String),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    gradient: isSelected ? AppTheme.coolGradient : null,
                    color: isSelected ? null : (isDark ? AppTheme.darkCardColor : const Color(0xFFF1F5F9)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    type['label'] as String,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white
                            : (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
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
                gradient: AppTheme.coolGradient,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.monitor_heart_rounded, color: Colors.white, size: 40),
            ),
            const SizedBox(height: 20),
            Text('Beslenme Analizi', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Stoğundaki ürünlere göre yapay zeka\nbeslenme analizini yapar.',
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
                    gradient: AppTheme.coolGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.monitor_heart_rounded, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 10),
                const Text('Analiz Sonucu',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const Spacer(),
                TextButton.icon(
                  onPressed: _analyze,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Yenile'),
                ),
              ],
            ),
            const Divider(height: 20),
            MarkdownBody(data: _result ?? ''),
          ],
        ),
      ),
    );
  }
}
