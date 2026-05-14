import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:market_mobile/screens/login_screen.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'address_list_screen.dart';
import 'stock_screen.dart';
import 'account_screen.dart';
import 'order_screen.dart';
import 'dietary_preferences_screen.dart';
import '../theme/app_theme.dart';
import '../constants/api_constants.dart';

class ProfileScreen extends StatefulWidget {
  final bool inPanel;
  const ProfileScreen({super.key, this.inPanel = false});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? userData;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchUserData();
  }

  Future<void> _fetchUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) {
      setState(() => isLoading = false);
      return;
    }
    try {
      final response = await http.get(
        Uri.parse('${getBaseUrl()}/api/auth/me'),
        headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
      );
      if (response.statusCode == 200) {
        setState(() {
          userData = json.decode(response.body);
          isLoading = false;
        });
      } else {
        setState(() => isLoading = false);
      }
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  void _navigateTo(Widget screen) {
    if (kIsWeb) {
      showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: "Kapat",
        barrierColor: Colors.black54,
        transitionDuration: const Duration(milliseconds: 280),
        pageBuilder: (ctx, a1, a2) => Align(
          alignment: Alignment.centerRight,
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: 420,
              height: double.infinity,
              color: Theme.of(context).scaffoldBackgroundColor,
              child: SafeArea(child: screen),
            ),
          ),
        ),
        transitionBuilder: (ctx, a1, a2, child) => SlideTransition(
          position: Tween(begin: const Offset(1, 0), end: Offset.zero)
              .animate(CurvedAnimation(parent: a1, curve: Curves.easeOut)),
          child: child,
        ),
      );
    } else {
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (isLoading) {
      return widget.inPanel
          ? const Center(child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor)))
          : Scaffold(
              body: Center(child: CircularProgressIndicator(
                valueColor: const AlwaysStoppedAnimation(AppTheme.primaryColor))),
            );
    }

    final name = userData?['name'] ?? '';
    final surname = userData?['surname'] ?? '';
    final email = userData?['email'] ?? '';
    final phone = userData?['phone'] ?? '';
    final initials = '${name.isNotEmpty ? name[0] : '?'}${surname.isNotEmpty ? surname[0] : ''}';

    final content = SingleChildScrollView(
      child: Column(
        children: [
          // Gradient başlık bölümü
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(24, 40, 24, 32),
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
            ),
            child: Column(
              children: [
                // Avatar
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
                  ),
                  child: Center(
                    child: Text(
                      initials.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '$name $surname',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    phone,
                    style: const TextStyle(color: Colors.white60, fontSize: 13),
                  ),
                ],
              ],
            ),
          ),
          // Menü öğeleri
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildMenuSection(
                  isDark: isDark,
                  title: 'Hesap',
                  items: [
                    _MenuItem(
                      icon: Icons.manage_accounts_outlined,
                      label: 'Hesap Bilgilerim',
                      onTap: () => _navigateTo(AccountScreen(
                        userData: userData,
                        refreshParent: _fetchUserData,
                      )),
                    ),
                    _MenuItem(
                      icon: Icons.location_on_outlined,
                      label: 'Adreslerim',
                      onTap: () => _navigateTo(const AddressListScreen()),
                    ),
                    _MenuItem(
                      icon: Icons.restaurant_menu_outlined,
                      label: 'Diyet Tercihlerim',
                      onTap: () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const DietaryPreferencesScreen())),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildMenuSection(
                  isDark: isDark,
                  title: 'Alışveriş',
                  items: [
                    _MenuItem(
                      icon: Icons.receipt_long_outlined,
                      label: 'Siparişlerim',
                      onTap: () => _navigateTo(const OrderScreen()),
                    ),
                    _MenuItem(
                      icon: Icons.inventory_2_outlined,
                      label: 'Stoğum',
                      onTap: () => _navigateTo(StockScreen()),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Çıkış butonu
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout_rounded, size: 18),
                    label: const Text('Çıkış Yap'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.errorColor,
                      side: const BorderSide(color: AppTheme.errorColor),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ],
      ),
    );

    if (widget.inPanel) return content;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profilim'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: content,
    );
  }

  Widget _buildMenuSection({
    required bool isDark,
    required String title,
    required List<_MenuItem> items,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: isDark ? AppTheme.darkCardColor : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppTheme.darkBorder : const Color(0x0F000000),
            ),
          ),
          child: Column(
            children: items.asMap().entries.map((entry) {
              final i = entry.key;
              final item = entry.value;
              return Column(
                children: [
                  ListTile(
                    dense: false,
                    leading: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(item.icon, color: AppTheme.primaryColor, size: 20),
                    ),
                    title: Text(
                      item.label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                      ),
                    ),
                    trailing: Icon(Icons.chevron_right_rounded,
                      color: isDark ? const Color(0xFF475569) : Colors.grey[400], size: 20),
                    onTap: item.onTap,
                  ),
                  if (i < items.length - 1)
                    Divider(
                      height: 1,
                      indent: 60,
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });
}
