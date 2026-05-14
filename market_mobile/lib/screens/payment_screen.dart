import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../services/stock_service.dart';
import '../services/order_service.dart';
import '../models/order_model.dart';
import '../constants/api_constants.dart';
import '../theme/app_theme.dart';
import 'address_list_screen.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class PaymentScreen extends StatefulWidget {
  /// Eski akış uyumluluğu; adres seçimi ekran içinde yapılır.
  final String address;
  final String? note;
  final List<Map<String, dynamic>> cartItems;
  final double totalAmount;
  const PaymentScreen({
    Key? key,
    this.address = '',
    this.note,
    this.cartItems = const [
      {'name': 'Portakal', 'qty': 2, 'price': 35.0},
      {'name': 'Elma', 'qty': 1, 'price': 28.0},
    ],
    this.totalAmount = 98.0,
  }) : super(key: key);

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String? selectedPayment;
  bool saveCard = false;
  bool kvkkOk = false;
  bool contractOk = false;
  final _cardNoController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvvController = TextEditingController();
  final _cardNameController = TextEditingController();
  final _invoiceController = TextEditingController();
  String _orderNote = '';

  // Adres yönetimi için
  List<Map<String, dynamic>> _addresses = [];
  bool _isAddressLoading = true;
  String? _selectedAddressId;
  String? _selectedAddressText;

  @override
  void initState() {
    super.initState();
    _fetchAddresses();
  }

  Future<void> _fetchAddresses() async {
    setState(() { _isAddressLoading = true; });
    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('uid');
    final token = prefs.getString('token');
    if (uid == null || token == null) {
      setState(() { _isAddressLoading = false; });
      return;
    }
    final url = '${getBaseUrl()}${ApiPaths.auth}/users/$uid/addresses';
    try {
      final response = await http.get(Uri.parse(url), headers: {'Authorization': 'Bearer $token'});
      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        setState(() {
          _addresses = data.cast<Map<String, dynamic>>();
          // Varsayılan adresi seçili yap
          final defaultAddr = _addresses.firstWhere(
            (a) => a['isDefault'] == true,
            orElse: () => _addresses.isNotEmpty ? _addresses[0] : <String, dynamic>{},
          );
          _selectedAddressId = defaultAddr.isNotEmpty ? defaultAddr['id'] ?? defaultAddr['_id'] : null;
          _selectedAddressText = defaultAddr.isNotEmpty ? _addressToString(defaultAddr) : null;
          _isAddressLoading = false;
        });
      } else {
        setState(() { _isAddressLoading = false; });
      }
    } catch (e) {
      setState(() { _isAddressLoading = false; });
    }
  }

  String _addressToString(Map<String, dynamic> addr) {
    return '${addr['title']} - ${addr['mahalle']} ${addr['sokak']} No:${addr['binaNo']} Kat:${addr['kat']} Daire:${addr['daireNo']}';
  }

  @override
  Widget build(BuildContext context) {
    final isWeb = kIsWeb;
    final double maxWidth = isWeb ? 540 : 400;
    final double cardPadding = isWeb ? 32 : 18;
    final double fontSize = isWeb ? 22 : 18;
    final double buttonHeight = isWeb ? 56 : 48;

    // Sepet verisi
    final cart = Provider.of<CartProvider>(context);
    final cartItems = cart.items.values.toList();
    final totalAmount = cart.totalAmount;

    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;
    final pageBg = isDark ? AppTheme.darkBackground : AppTheme.lightBackground;
    final cardBg = isDark ? AppTheme.darkCardColor : AppTheme.lightSurface;
    final onCard = isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A);
    final muted = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final inputFill = isDark ? const Color(0xFF131929) : const Color(0xFFF1F5F9);
    final borderColor = isDark ? AppTheme.darkBorder : const Color(0x1A000000);
    final accent = AppTheme.primaryColor;

    return Scaffold(
      backgroundColor: pageBg,
      appBar: AppBar(
        backgroundColor: pageBg,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        iconTheme: IconThemeData(color: onCard),
        title: Text('Ödeme', style: TextStyle(color: onCard, fontWeight: FontWeight.w700)),
        centerTitle: true,
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: BoxConstraints(maxWidth: maxWidth),
            padding: EdgeInsets.all(cardPadding),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: borderColor),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.06),
                  blurRadius: 32,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Sipariş Özeti', style: TextStyle(color: onCard, fontSize: fontSize, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                ...cartItems.map((item) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${item.name} x${item.quantity.toStringAsFixed(1)} ${item.unit}', style: TextStyle(color: muted, fontSize: fontSize-2)),
                    Text('₺${(item.price * item.quantity).toStringAsFixed(2)}', style: TextStyle(color: onCard, fontSize: fontSize-2)),
                  ],
                )),
                Divider(color: isDark ? Colors.white12 : Colors.black12, height: 28),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Toplam', style: TextStyle(color: onCard, fontSize: fontSize, fontWeight: FontWeight.bold)),
                    Text('₺${totalAmount.toStringAsFixed(2)}', style: TextStyle(color: accent, fontSize: fontSize, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Teslimat Adresi', style: TextStyle(color: onCard, fontSize: fontSize, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _isAddressLoading
                  ? const Center(child: CircularProgressIndicator())
                  : (_addresses.isEmpty
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Teslimat için kayıtlı bir adresiniz yok.',
                            style: TextStyle(color: muted),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: () async {
                              await Navigator.push<void>(
                                context,
                                MaterialPageRoute<void>(
                                  builder: (_) => const AddressListScreen(inPanel: false),
                                ),
                              );
                              if (context.mounted) await _fetchAddresses();
                            },
                            icon: Icon(Icons.add_location_alt_outlined, color: accent),
                            label: Text('Yeni adres ekle', style: TextStyle(color: onCard)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: onCard,
                              side: BorderSide(color: accent.withValues(alpha: 0.7)),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                          ),
                        ],
                      )
                    : DropdownButton<String>(
                        value: _selectedAddressId,
                        dropdownColor: inputFill,
                        isExpanded: true,
                        iconEnabledColor: onCard,
                        style: TextStyle(color: onCard, fontSize: fontSize-2),
                        items: _addresses.map((addr) {
                          final id = addr['id'] ?? addr['_id'];
                          return DropdownMenuItem<String>(
                            value: id,
                            child: Text(_addressToString(addr)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedAddressId = val;
                            final addr = _addresses.firstWhere((a) => (a['id'] ?? a['_id']) == val);
                            _selectedAddressText = _addressToString(addr);
                          });
                        },
                      )
                  ),
                const SizedBox(height: 18),
                Text('Sipariş Notu (isteğe bağlı)', style: TextStyle(color: onCard, fontSize: fontSize, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Siparişinizle ilgili not ekleyebilirsiniz...',
                    hintStyle: TextStyle(color: muted),
                    filled: true,
                    fillColor: inputFill,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                  style: TextStyle(color: onCard, fontSize: fontSize-2),
                  maxLines: 2,
                  onChanged: (val) => setState(() { _orderNote = val; }),
                ),
                const SizedBox(height: 18),
                Text('Ödeme Seçeneği', style: TextStyle(color: onCard, fontSize: fontSize, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                _buildPaymentOption('Kapıda Ödeme', Icons.payments, onCard, muted, inputFill, accent),
                const SizedBox(height: 14),
                _buildPaymentOption('Kredi Kartı', Icons.credit_card, onCard, muted, inputFill, accent),
                const SizedBox(height: 18),
                if (selectedPayment == 'Kredi Kartı') ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: inputFill,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Kart Bilgileri', style: TextStyle(color: onCard, fontSize: fontSize, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _cardNoController,
                          keyboardType: TextInputType.number,
                          maxLength: 19,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          decoration: InputDecoration(
                            labelText: 'Kart Numarası',
                            labelStyle: TextStyle(color: muted),
                            filled: true,
                            fillColor: cardBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            counterText: '',
                          ),
                          style: TextStyle(color: onCard, fontSize: fontSize-2),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _expiryController,
                                keyboardType: TextInputType.number,
                                maxLength: 5,
                                decoration: InputDecoration(
                                  labelText: 'AA/YY',
                                  labelStyle: TextStyle(color: muted),
                                  filled: true,
                                  fillColor: cardBg,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                                  counterText: '',
                                ),
                                style: TextStyle(color: onCard, fontSize: fontSize-4),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _cvvController,
                                keyboardType: TextInputType.number,
                                maxLength: 3,
                                decoration: InputDecoration(
                                  labelText: 'CVV',
                                  labelStyle: TextStyle(color: muted),
                                  filled: true,
                                  fillColor: cardBg,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                                  counterText: '',
                                ),
                                style: TextStyle(color: onCard, fontSize: fontSize-4),
                                obscureText: true,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _cardNameController,
                          decoration: InputDecoration(
                            labelText: 'Kart Üzerindeki İsim',
                            labelStyle: TextStyle(color: muted),
                            filled: true,
                            fillColor: cardBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                          style: TextStyle(color: onCard, fontSize: fontSize-2),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Checkbox(
                              value: saveCard,
                              onChanged: (v) => setState(() => saveCard = v ?? false),
                              activeColor: accent,
                            ),
                            Text('Kartı kaydet', style: TextStyle(color: muted)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                ],
                Text('Fatura Bilgisi (isteğe bağlı)', style: TextStyle(color: onCard, fontSize: fontSize, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(
                  controller: _invoiceController,
                  decoration: InputDecoration(
                    hintText: 'Fatura adresi veya firma bilgisi',
                    hintStyle: TextStyle(color: muted),
                    filled: true,
                    fillColor: inputFill,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                  style: TextStyle(color: onCard, fontSize: fontSize-2),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Checkbox(
                      value: kvkkOk,
                      onChanged: (v) => setState(() => kvkkOk = v ?? false),
                      activeColor: accent,
                    ),
                    Expanded(child: Text("KVKK Aydınlatma Metni'ni okudum, kabul ediyorum.", style: TextStyle(color: muted, fontSize: 14))),
                  ],
                ),
                Row(
                  children: [
                    Checkbox(
                      value: contractOk,
                      onChanged: (v) => setState(() => contractOk = v ?? false),
                      activeColor: accent,
                    ),
                    Expanded(child: Text("Mesafeli Satış Sözleşmesi'ni okudum, kabul ediyorum.", style: TextStyle(color: muted, fontSize: 14))),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.lock, color: AppTheme.successColor, size: 28),
                    const SizedBox(width: 8),
                    Text('Güvenli SSL ile ödeme', style: TextStyle(color: muted)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.support_agent, color: accent, size: 24),
                    const SizedBox(width: 6),
                    Text('Destek: 0850 000 00 00', style: TextStyle(color: muted.withValues(alpha: 0.85))),
                  ],
                ),
                const SizedBox(height: 24),
                SizedBox(
                  height: buttonHeight,
                  child: ElevatedButton(
                    onPressed: (selectedPayment == null || !kvkkOk || !contractOk || _selectedAddressId == null) ? null : () async {
                      // Sipariş için adres bilgilerini al
                      final selectedAddress = _addresses.firstWhere(
                        (addr) => (addr['id'] ?? addr['_id']) == _selectedAddressId,
                        orElse: () => <String, dynamic>{},
                      );
                      
                      // Stoğa ekleme işlemi
                      final List<Map<String, dynamic>> stockItems = cartItems.map((item) => {
                        'id': item.id,
                        'name': item.name,
                        'image_url': item.imageUrl,
                        'qty': item.quantity,
                        'unit': item.unit,
                        'category': item.category ?? 'all',
                        'price': item.price,
                        'stock': item.stock,
                      }).toList();
                      
                      for (final item in stockItems) {
                        print('Stoğa eklenecek ürün: [36m${item['name']}[0m - kategori: [33m${item['category']}[0m');
                        await StockService.addOrUpdateStock(item);
                      }
                      
                      // Sipariş ekleme işlemi
                      try {
                        // Sepetteki ürünleri sipariş formatına dönüştür
                        final List<Map<String, dynamic>> orderProducts = cartItems.map((item) => {
                          'name': item.name,
                          'quantity': item.quantity,
                          'price': item.price,
                          'imageUrl': item.imageUrl,
                        }).toList();
                        
                        // Sipariş numarası oluştur (basit bir örnek)
                        final String orderNumber = 'ORD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
                        
                        // Adres bilgisini String tipine dönüştürme
                        Map<String, String> orderAddress = {};
                        if (selectedAddress.isNotEmpty) {
                          selectedAddress.forEach((key, value) {
                            orderAddress[key] = value?.toString() ?? '';
                          });
                        } else {
                          orderAddress = {'full': 'Adres bilgisi bulunamadı'};
                        }
                        
                        // OrderModel oluştur
                        final OrderModel newOrder = OrderModel(
                          orderId: '', // OrderService içinde oluşturulacak
                          userId: '', // OrderService içinde alınacak
                          orderNumber: orderNumber,
                          products: orderProducts,
                          totalPrice: totalAmount,
                          paymentMethod: selectedPayment ?? 'Kapıda Ödeme',
                          address: orderAddress,
                          lastFourDigits: selectedPayment == 'Kredi Kartı' 
                              ? _cardNoController.text.isEmpty ? null : _cardNoController.text.replaceAll(' ', '').substring(_cardNoController.text.length - 4)
                              : null,
                          timestamp: DateTime.now().millisecondsSinceEpoch,
                          status: 'active',
                          rating: null,
                        );
                        
                        // OrderService ile siparişi ekle
                        final orderService = OrderService();
                        await orderService.addOrder(newOrder);
                        
                        print('Sipariş başarıyla oluşturuldu: $orderNumber');
                        
                        // Sepeti temizle
                        cart.clear();
                        
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Satın alma işlemi başarılı! Sipariş oluşturuldu.')),
                        );
                        Navigator.of(context).pop();
                      } catch (e) {
                        print('Sipariş oluşturma hatası: $e');
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Sipariş oluşturulurken hata oluştu: $e')),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(22),
                      ),
                      elevation: 0,
                      textStyle: TextStyle(fontSize: fontSize, fontWeight: FontWeight.bold),
                    ),
                    child: const Text('Ödemeyi Tamamla', style: TextStyle(color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentOption(String title, IconData icon, Color onCard, Color muted, Color inputFill, Color accent) {
    final isSelected = selectedPayment == title;
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedPayment = title;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: isSelected ? accent.withValues(alpha: 0.12) : inputFill,
          borderRadius: BorderRadius.circular(18),
          border: isSelected ? Border.all(color: accent, width: 2) : Border.all(color: muted.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Icon(icon, color: onCard, size: 28),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: TextStyle(color: onCard, fontSize: 20, fontWeight: FontWeight.w500),
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: accent, size: 28),
          ],
        ),
      ),
    );
  }
} 