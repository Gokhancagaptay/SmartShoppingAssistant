import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../services/analysis_service.dart';
import '../services/dietary_preferences_service.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'payment_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  bool _isChatOpen = false;
  bool _isAiLoading = false;
  String _aiResponse = '';
  final TextEditingController _customQuestionController = TextEditingController();

  static const List<Map<String, dynamic>> _quickQuestions = [
    {'label': 'Sepetim sağlıklı mı?', 'action': 'analyze', 'icon': Icons.favorite_outline},
    {'label': 'Ne yemek yapabilirim?', 'action': 'suggest', 'icon': Icons.restaurant_outlined},
    {'label': 'Fiyat analizi', 'action': 'price', 'icon': Icons.attach_money_rounded},
    {'label': 'Kaç gün yeter?', 'action': 'days', 'icon': Icons.calendar_today_outlined},
  ];

  Future<void> _askAi(String action, {String? customQ}) async {
    if (_isAiLoading) return;
    setState(() {
      _isAiLoading = true;
      _aiResponse = '';
    });
    try {
      final cart = context.read<CartProvider>();
      final items = cart.items.values.map((i) => i.name).toList();
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final dietCtx = await DietaryPreferencesService.buildDietaryContext();
      final itemsWithDiet = dietCtx.isNotEmpty ? [...items, '__DIET__$dietCtx'] : items;
      String result;
      switch (action) {
        case 'suggest':
          result = await AnalysisService.suggestRecipe(itemsWithDiet, token: token);
          break;
        case 'analyze':
          result = await AnalysisService.analyzeCartItems(itemsWithDiet, token: token);
          break;
        case 'price':
          result = await AnalysisService.priceAnalysis(items);
          break;
        case 'custom':
          result = await AnalysisService.customQuestion(items, customQ ?? '');
          break;
        default:
          result = await AnalysisService.analyzeCartItems(itemsWithDiet, token: token);
      }
      if (mounted) setState(() => _aiResponse = result);
    } catch (e) {
      if (mounted) setState(() => _aiResponse = 'Hata oluştu: $e');
    } finally {
      if (mounted) setState(() => _isAiLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cart = context.watch<CartProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sepetim'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (cart.items.isNotEmpty)
            TextButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (_) => AlertDialog(
                    title: const Text('Sepeti Temizle'),
                    content: const Text('Sepetteki tüm ürünler kaldırılacak. Emin misiniz?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(context), child: const Text('İptal')),
                      TextButton(
                        onPressed: () {
                          cart.clear();
                          Navigator.pop(context);
                        },
                        child: const Text('Temizle', style: TextStyle(color: AppTheme.errorColor)),
                      ),
                    ],
                  ),
                );
              },
              child: Text('Temizle',
                style: TextStyle(
                  color: AppTheme.errorColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                )),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: cart.items.isEmpty
          ? _buildEmptyCart(isDark)
          : Column(
              children: [
                // Ürün listesi
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, i) {
                      final item = cart.items.values.toList()[i];
                      return _CartItemCard(item: item, isDark: isDark);
                    },
                  ),
                ),
                // AI + Ödeme bölümü
                _buildBottomSection(isDark, cart),
              ],
            ),
      // AI chat paneli
      floatingActionButton: cart.items.isNotEmpty
          ? FloatingActionButton(
              onPressed: () => setState(() => _isChatOpen = !_isChatOpen),
              backgroundColor: AppTheme.primaryColor,
              child: Icon(
                _isChatOpen ? Icons.close_rounded : Icons.auto_awesome_rounded,
                color: Colors.white,
              ),
            )
          : null,
      // Slayt yukarı AI paneli
      bottomSheet: _isChatOpen ? _buildAiPanel(isDark, cart) : null,
    );
  }

  Widget _buildEmptyCart(bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.shopping_cart_outlined,
              size: 48, color: AppTheme.primaryColor),
          ),
          const SizedBox(height: 20),
          Text(
            'Sepetiniz Boş',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Ürünleri sepetinize ekleyerek\nalışverişe başlayın',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 28),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.store_rounded, size: 18),
            label: const Text('Alışverişe Başla'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomSection(bool isDark, CartProvider cart) {
    final totalItems = cart.items.values
        .fold<double>(0, (s, i) => s + i.quantity)
        .toInt();
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurface : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
          ),
        ),
        boxShadow: isDark ? [] : [
          const BoxShadow(color: Color(0x0A000000), blurRadius: 16, offset: Offset(0, -4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Özet satırı
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Toplam', style: TextStyle(
                    fontSize: 12,
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  )),
                  Text(
                    '₺${cart.totalAmount.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$totalItems ürün',
                  style: const TextStyle(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PaymentScreen()),
            ),
            child: Container(
              height: 52,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withValues(alpha: 0.4),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.payment_rounded, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Ödemeye geç',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
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

  Widget _buildAiPanel(bool isDark, CartProvider cart) {
    return Container(
      height: 460,
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurface : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.1),
            blurRadius: 24,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: Column(
        children: [
          // Panel başlığı
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 16, 12),
            decoration: const BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'AI Sepet Danışmanı',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                  onPressed: () => setState(() => _isChatOpen = false),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
          // Hızlı sorular
          SizedBox(
            height: 46,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: _quickQuestions.map((q) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => _askAi(q['action'] as String),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(q['icon'] as IconData, size: 14, color: AppTheme.primaryColor),
                          const SizedBox(width: 6),
                          Text(
                            q['label'] as String,
                            style: const TextStyle(
                              color: AppTheme.primaryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          // Cevap alanı
          Expanded(
            child: _isAiLoading
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor),
                          strokeWidth: 2,
                        ),
                        SizedBox(height: 12),
                        Text('AI düşünüyor...', style: TextStyle(fontSize: 13, color: AppTheme.primaryColor)),
                      ],
                    ),
                  )
                : _aiResponse.isEmpty
                    ? Center(
                        child: Text(
                          'Yukarıdan bir soru seçin veya kendi sorunuzu yazın',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                          ),
                        ),
                      )
                    : Markdown(
                        data: _aiResponse,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
                          p: TextStyle(
                            fontSize: 13,
                            color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                            height: 1.6,
                          ),
                        ),
                      ),
          ),
          // Soru yazma alanı
          Padding(
            padding: EdgeInsets.fromLTRB(12, 0, 12, MediaQuery.of(context).viewInsets.bottom + 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _customQuestionController,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                    ),
                    decoration: InputDecoration(
                      hintText: 'Sorunuzu yazın...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      isDense: true,
                    ),
                    onSubmitted: (v) {
                      if (v.trim().isNotEmpty) {
                        _askAi('custom', customQ: v.trim());
                        _customQuestionController.clear();
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () {
                    final q = _customQuestionController.text.trim();
                    if (q.isNotEmpty) {
                      _askAi('custom', customQ: q);
                      _customQuestionController.clear();
                    }
                  },
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _customQuestionController.dispose();
    super.dispose();
  }
}

/// Sepet ürün kartı
class _CartItemCard extends StatelessWidget {
  final CartItem item;
  final bool isDark;

  const _CartItemCard({required this.item, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartProvider>();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
        ),
      ),
      child: Row(
        children: [
          // Görsel
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              item.imageUrl,
              width: 64,
              height: 64,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 64,
                height: 64,
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                child: Icon(Icons.image_not_supported_outlined,
                  color: isDark ? const Color(0xFF475569) : Colors.grey[300], size: 28),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Ad ve fiyat
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  '₺${item.price.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: AppTheme.primaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          // Miktar kontrolü
          Row(
            children: [
              _QtyBtn(
                icon: item.quantity <= 1 ? Icons.delete_outline_rounded : Icons.remove_rounded,
                color: item.quantity <= 1 ? AppTheme.errorColor : AppTheme.primaryColor,
                bgColor: item.quantity <= 1
                    ? AppTheme.errorColor.withValues(alpha: 0.1)
                    : AppTheme.primaryColor.withValues(alpha: 0.1),
                onTap: () => cart.removeSingleItem(item.id),
              ),
              SizedBox(
                width: 36,
                child: Text(
                  '${item.quantity.toInt()}',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                  ),
                ),
              ),
              _QtyBtn(
                icon: Icons.add_rounded,
                color: AppTheme.primaryColor,
                bgColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                onTap: () => cart.addItem(item.id, item.name, item.price, item.imageUrl,
                    stock: item.stock, unit: item.unit, label: item.label, category: item.category),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color bgColor;
  final VoidCallback onTap;

  const _QtyBtn({
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: color, size: 16),
      ),
    );
  }
}
