import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:market_mobile/models/order_model.dart';
import 'package:market_mobile/services/order_service.dart';
import 'package:market_mobile/theme/app_theme.dart';

class OrderScreen extends StatefulWidget {
  final bool inPanel;
  const OrderScreen({super.key, this.inPanel = false});

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  final OrderService _orderService = OrderService();
  late Future<List<OrderModel>> _ordersFuture;
  final _searchCtrl = TextEditingController();
  String _searchTerm = '';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _refresh() => setState(() => _ordersFuture = _fetchOrders());

  Future<List<OrderModel>> _fetchOrders() async {
    try {
      final orders = await _orderService.fetchOrdersHttp();
      if (orders.isNotEmpty) return orders;
      return await _orderService.getOrders().first;
    } catch (_) {
      return [];
    }
  }

  Future<void> _cancelOrder(OrderModel order) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Siparişi İptal Et'),
        content: Text('Sipariş #${order.orderNumber} iptal edilecek. Onaylıyor musunuz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Vazgeç')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('İptal Et', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await _orderService.cancelOrder(order.orderId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sipariş iptal edildi'), backgroundColor: AppTheme.errorColor),
      );
      _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('İptal başarısız: $e'), backgroundColor: AppTheme.errorColor),
      );
    }
  }

  List<OrderModel> _filtered(List<OrderModel> orders) {
    if (_searchTerm.isEmpty) return orders;
    final q = _searchTerm.toLowerCase();
    return orders.where((o) {
      final date = DateFormat('dd.MM.yyyy').format(DateTime.fromMillisecondsSinceEpoch(o.timestamp));
      return o.orderNumber.toLowerCase().contains(q) ||
          date.contains(q) ||
          o.products.any((p) => p['name'].toString().toLowerCase().contains(q));
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Siparişlerim'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Sipariş veya ürün ara...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchTerm.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _searchTerm = '');
                        },
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _searchTerm = v),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<OrderModel>>(
              future: _ordersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError || !snapshot.hasData || snapshot.data!.isEmpty) {
                  return _buildEmpty(isDark);
                }
                final displayed = _filtered(snapshot.data!);
                if (displayed.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off,
                            size: 48, color: isDark ? const Color(0xFF475569) : Colors.grey[300]),
                        const SizedBox(height: 12),
                        const Text('Sonuç bulunamadı'),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  itemCount: displayed.length,
                  itemBuilder: (_, i) => _OrderCard(
                    order: displayed[i],
                    isDark: isDark,
                    onCancel: () => _cancelOrder(displayed[i]),
                    onRate: () => _showRatingDialog(displayed[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_outlined,
              size: 64,
              color: isDark ? const Color(0xFF334155) : Colors.grey[300]),
          const SizedBox(height: 16),
          Text('Henüz sipariş yok',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500])),
          const SizedBox(height: 8),
          Text('Alışveriş yaparak ilk siparişini oluştur',
              style: TextStyle(
                  fontSize: 14,
                  color: isDark ? const Color(0xFF64748B) : Colors.grey[400])),
        ],
      ),
    );
  }

  Future<void> _showRatingDialog(OrderModel order) async {
    int? currentRating;
    await showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Siparişi Değerlendir', textAlign: TextAlign.center),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Sipariş #${order.orderNumber}',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setDialogState(() => currentRating = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      currentRating != null && currentRating! > i
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color: const Color(0xFFF59E0B),
                      size: 36,
                    ),
                  ),
                )),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('İptal')),
            ElevatedButton(
              onPressed: currentRating == null
                  ? null
                  : () async {
                      try {
                        await _orderService.updateOrderRating(order.orderId, currentRating!);
                        if (!context.mounted) return;
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Değerlendirmeniz kaydedildi!')),
                        );
                        _refresh();
                      } catch (_) {
                        if (!context.mounted) return;
                        Navigator.pop(context);
                      }
                    },
              child: const Text('Gönder'),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderModel order;
  final bool isDark;
  final VoidCallback onCancel;
  final VoidCallback onRate;

  const _OrderCard({
    required this.order,
    required this.isDark,
    required this.onCancel,
    required this.onRate,
  });

  bool get _cancellable {
    final s = order.status?.toLowerCase() ?? '';
    return s == 'pending' || s == 'processing';
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = AppTheme.getStatusColor(order.status ?? 'pending');
    final statusLabel = AppTheme.getStatusLabel(order.status ?? 'pending');
    final date = DateFormat('dd.MM.yyyy').format(
        DateTime.fromMillisecondsSinceEpoch(order.timestamp));

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCardColor : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppTheme.darkBorder : const Color(0x0F000000)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.receipt_outlined, color: statusColor, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Sipariş #${order.orderNumber}',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      Text(date,
                          style: TextStyle(
                              fontSize: 12,
                              color: isDark ? const Color(0xFF94A3B8) : Colors.grey[500])),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(statusLabel,
                      style: TextStyle(
                          color: statusColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Products
            ...order.products.take(2).map((p) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Container(
                    width: 5,
                    height: 5,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF475569) : Colors.grey[300],
                        shape: BoxShape.circle),
                  ),
                  Expanded(
                    child: Text(
                      '${p['name']} × ${p['quantity']}',
                      style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A)),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            )),
            if (order.products.length > 2)
              Padding(
                padding: const EdgeInsets.only(left: 13, bottom: 4),
                child: Text(
                  '+ ${order.products.length - 2} ürün daha',
                  style: TextStyle(
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                      color: isDark ? const Color(0xFF64748B) : Colors.grey[500]),
                ),
              ),
            const SizedBox(height: 10),
            Divider(
                color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
                height: 1),
            const SizedBox(height: 10),
            // Footer row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Toplam: ₺${order.totalPrice.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: AppTheme.primaryColor),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_cancellable)
                      TextButton.icon(
                        onPressed: onCancel,
                        icon: const Icon(Icons.cancel_outlined, size: 16),
                        label: const Text('İptal'),
                        style: TextButton.styleFrom(foregroundColor: AppTheme.errorColor),
                      ),
                    if (order.status == 'completed' && order.rating == null)
                      TextButton.icon(
                        onPressed: onRate,
                        icon: const Icon(Icons.star_outline, size: 16),
                        label: const Text('Değerlendir'),
                        style: TextButton.styleFrom(foregroundColor: const Color(0xFFF59E0B)),
                      ),
                    if (order.rating != null)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(5, (i) => Icon(
                          i < order.rating! ? Icons.star_rounded : Icons.star_outline_rounded,
                          size: 14,
                          color: const Color(0xFFF59E0B),
                        )),
                      ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
