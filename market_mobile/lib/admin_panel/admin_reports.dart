import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../firebase/firebase_web_stub.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../constants/constants.dart';
import 'widgets/admin_topbar.dart';

class AdminReports extends StatefulWidget {
  const AdminReports({Key? key}) : super(key: key);

  @override
  State<AdminReports> createState() => _AdminReportsState();
}

class _AdminReportsState extends State<AdminReports> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _orders = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _users = [];
  
  // Özet istatistikler
  double _totalRevenue = 0;
  int _totalOrders = 0;
  int _activeUsers = 0;
  int _activeProducts = 0;
  
  // Grafik verileri
  Map<String, double> _categorySales = {};
  Map<String, double> _monthlySales = {};

  @override
  void initState() {
    super.initState();
    _loadReportData();
  }

  Future<void> _loadReportData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Siparişleri Firebase'den yükle
      final ordersRef = FirebaseDatabase.instance.ref('orders');
      final ordersSnapshot = await ordersRef.get();
      
      if (ordersSnapshot.exists && ordersSnapshot.value != null) {
        final Map<dynamic, dynamic> ordersMap = ordersSnapshot.value as Map;
        
        List<Map<String, dynamic>> ordersList = [];
        double revenue = 0;
        Map<String, double> categorySalesMap = {};
        Map<String, double> monthlySalesMap = {};
        
        ordersMap.forEach((key, value) {
          if (value is Map) {
            final Map<String, dynamic> orderData = {
              'id': key,
              'userId': value['userId'] ?? '',
              'date': value['date'] ?? DateTime.now().toIso8601String(),
              'total': (value['total'] ?? 0.0).toDouble(),
              'status': value['status'] ?? 'Beklemede',
            };
            
            // Toplam geliri hesapla
            final double orderTotal = orderData['total'];
            revenue += orderTotal;
            
            // Aylık satışları hesapla
            try {
              final DateTime orderDate = DateTime.parse(orderData['date']);
              final String monthKey = DateFormat('MMMM yyyy', 'tr_TR').format(orderDate);
              monthlySalesMap[monthKey] = (monthlySalesMap[monthKey] ?? 0) + orderTotal;
            } catch (e) {
              print('Tarih ayrıştırma hatası: $e');
            }
            
            // Kategori satışlarını hesapla
            if (value['items'] is List) {
              final List<dynamic> items = value['items'];
              items.forEach((item) {
                if (item is Map) {
                  final category = item['category'] ?? 'diğer';
                  final double itemTotal = (item['price'] ?? 0.0) * (item['quantity'] ?? 1);
                  categorySalesMap[category] = (categorySalesMap[category] ?? 0) + itemTotal;
                }
              });
            }
            
            ordersList.add(orderData);
          }
        });
        
        // Ürünleri MongoDB'den yükle
        final productsResponse = await http.get(Uri.parse('${getBaseUrl()}${ApiPaths.products}'));
        List<Map<String, dynamic>> productsList = [];
        
        if (productsResponse.statusCode == 200) {
          final List<dynamic> productsJson = jsonDecode(productsResponse.body);
          productsList = productsJson.map((json) => Map<String, dynamic>.from(json)).toList();
        }
        
        // Kullanıcıları Firebase'den yükle
        final usersRef = FirebaseDatabase.instance.ref('users');
        final usersSnapshot = await usersRef.get();
        List<Map<String, dynamic>> usersList = [];
        
        if (usersSnapshot.exists && usersSnapshot.value != null) {
          final Map<dynamic, dynamic> usersMap = usersSnapshot.value as Map;
          
          usersMap.forEach((key, value) {
            if (value is Map) {
              usersList.add({
                'id': key,
                'name': value['name'] ?? 'İsimsiz Kullanıcı',
                'email': value['email'] ?? '',
                'role': value['role'] ?? 'user',
              });
            }
          });
        }
        
        setState(() {
          _orders = ordersList;
          _products = productsList;
          _users = usersList;
          _totalRevenue = revenue;
          _totalOrders = ordersList.length;
          _activeUsers = usersList.length;
          _activeProducts = productsList.length;
          _categorySales = categorySalesMap;
          _monthlySales = monthlySalesMap;
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Rapor verileri yüklenirken hata: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF2E2E2E),
      body: Column(
        children: [
          AdminTopbar(title: 'Raporlar ve Analizler'),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Colors.deepOrange),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSummaryCards(),
                        const SizedBox(height: 24),
                        _buildMonthlySalesChart(),
                        const SizedBox(height: 24),
                        _buildCategorySalesChart(),
                        const SizedBox(height: 24),
                        _buildStatusBreakdown(),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    return Row(
      children: [
        _buildSummaryCard(
          title: 'Toplam Ciro',
          value: '₺${_totalRevenue.toStringAsFixed(2)}',
          icon: Icons.attach_money,
          color: Colors.green,
        ),
        const SizedBox(width: 16),
        _buildSummaryCard(
          title: 'Toplam Sipariş',
          value: _totalOrders.toString(),
          icon: Icons.shopping_bag,
          color: Colors.blue,
        ),
        const SizedBox(width: 16),
        _buildSummaryCard(
          title: 'Aktif Kullanıcılar',
          value: _activeUsers.toString(),
          icon: Icons.person,
          color: Colors.orange,
        ),
        const SizedBox(width: 16),
        _buildSummaryCard(
          title: 'Ürün Çeşidi',
          value: _activeProducts.toString(),
          icon: Icons.inventory,
          color: Colors.purple,
        ),
      ],
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Card(
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: const Color(0xFF333333),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: color, size: 28),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.trending_up, color: color, size: 16),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                value,
                style: GoogleFonts.montserrat(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: GoogleFonts.montserrat(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMonthlySalesChart() {
    if (_monthlySales.isEmpty) {
      return Card(
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: const Color(0xFF333333),
        child: SizedBox(
          height: 300,
          child: Center(
            child: Text(
              'Henüz satış verisi yok',
              style: GoogleFonts.montserrat(color: Colors.grey),
            ),
          ),
        ),
      );
    }

    final List<String> months = _monthlySales.keys.toList();
    months.sort((a, b) {
      // Ayları tarihe göre sırala (en eskiden yeniye)
      try {
        final aDate = DateFormat('MMMM yyyy', 'tr_TR').parse(a);
        final bDate = DateFormat('MMMM yyyy', 'tr_TR').parse(b);
        return aDate.compareTo(bDate);
      } catch (e) {
        return a.compareTo(b);
      }
    });

    final List<BarChartGroupData> barGroups = [];
    for (int i = 0; i < months.length; i++) {
      final month = months[i];
      barGroups.add(BarChartGroupData(
        x: i,
        barRods: [
          BarChartRodData(
            toY: _monthlySales[month]!,
            color: Colors.deepOrange,
            width: 20,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(6),
              topRight: Radius.circular(6),
            ),
          ),
        ],
      ));
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: const Color(0xFF333333),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Aylık Satış Analizi',
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: _monthlySales.values.reduce((a, b) => a > b ? a : b) * 1.2,
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        return BarTooltipItem(
                          '${months[group.x.toInt()]}\n₺${rod.toY.toStringAsFixed(2)}',
                          GoogleFonts.montserrat(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (double value, TitleMeta meta) {
                          final index = value.toInt();
                          if (index >= 0 && index < months.length) {
                            // Ayı kısaltılmış olarak göster
                            final parts = months[index].split(' ');
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                parts[0].substring(0, 3),
                                style: GoogleFonts.montserrat(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (double value, TitleMeta meta) {
                          return Text(
                            '₺${value.toStringAsFixed(0)}',
                            style: GoogleFonts.montserrat(
                              color: Colors.grey,
                              fontSize: 12,
                            ),
                          );
                        },
                        reservedSize: 60,
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(show: false),
                  barGroups: barGroups,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategorySalesChart() {
    if (_categorySales.isEmpty) {
      return Card(
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        color: const Color(0xFF333333),
        child: SizedBox(
          height: 300,
          child: Center(
            child: Text(
              'Henüz kategori verisi yok',
              style: GoogleFonts.montserrat(color: Colors.grey),
            ),
          ),
        ),
      );
    }

    final List<Color> colors = [
      Colors.deepOrange,
      Colors.blue,
      Colors.green,
      Colors.purple,
      Colors.amber,
      Colors.teal,
      Colors.pink,
      Colors.indigo,
    ];

    final double total = _categorySales.values.fold(0, (sum, value) => sum + value);
    final List<PieChartSectionData> sections = [];

    int colorIndex = 0;
    _categorySales.forEach((category, value) {
      final double percentage = (value / total) * 100;
      sections.add(PieChartSectionData(
        color: colors[colorIndex % colors.length],
        value: value,
        title: '${percentage.toStringAsFixed(1)}%',
        radius: 100,
        titleStyle: GoogleFonts.montserrat(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ));
      colorIndex++;
    });

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: const Color(0xFF333333),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kategori Bazlı Satışlar',
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 250,
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: PieChart(
                      PieChartData(
                        sections: sections,
                        centerSpaceRadius: 40,
                        sectionsSpace: 2,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ..._buildCategoryLegends(colors),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildCategoryLegends(List<Color> colors) {
    final List<Widget> legends = [];
    int colorIndex = 0;

    for (var entry in _categorySales.entries) {
      legends.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: colors[colorIndex % colors.length],
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  entry.key,
                  style: GoogleFonts.montserrat(
                    fontSize: 14,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '₺${entry.value.toStringAsFixed(2)}',
                style: GoogleFonts.montserrat(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      );
      colorIndex++;
    }

    return legends;
  }

  Widget _buildStatusBreakdown() {
    final Map<String, int> statusCounts = {};
    
    // Sipariş durumlarını hesapla
    for (final order in _orders) {
      final status = order['status'] ?? 'Beklemede';
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    final List<Color> statusColors = [
      Colors.orange,  // Beklemede
      Colors.blue,    // İşleniyor
      Colors.green,   // Tamamlandı
      Colors.red,     // İptal
    ];

    final Map<String, Color> colorMap = {
      'Beklemede': Colors.orange,
      'İşleniyor': Colors.blue,
      'Tamamlandı': Colors.green,
      'İptal': Colors.red,
      'other': Colors.grey,
    };

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: const Color(0xFF333333),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sipariş Durumu Dağılımı',
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: statusCounts.entries.map((entry) {
                final color = colorMap[entry.key] ?? Colors.grey;
                return Expanded(
                  child: _buildStatusCard(
                    status: entry.key,
                    count: entry.value,
                    color: color,
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard({
    required String status,
    required int count,
    required Color color,
  }) {
    return Card(
      color: const Color(0xFF3A3A3A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _getStatusIcon(status),
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              count.toString(),
              style: GoogleFonts.montserrat(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              status,
              style: GoogleFonts.montserrat(
                fontSize: 12,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'tamamlandı':
        return Icons.check_circle;
      case 'beklemede':
        return Icons.schedule;
      case 'işleniyor':
        return Icons.sync;
      case 'iptal':
        return Icons.cancel;
      default:
        return Icons.help;
    }
  }
} 