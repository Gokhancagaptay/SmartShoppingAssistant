import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/dietary_preferences_service.dart';

/// Gemini'den gelen ham tarif metnini parse edip
/// temiz tarif + 1 kişilik porsiyon kartı + "Tarifi Yaptım" aksiyonu ile gösterir.
class RecipeResultCard extends StatefulWidget {
  final String rawSuggestion;

  const RecipeResultCard({super.key, required this.rawSuggestion});

  @override
  State<RecipeResultCard> createState() => _RecipeResultCardState();
}

/// Parse edilmiş tarif verisi
class _ParsedRecipe {
  final String cleanText;
  final List<Map<String, dynamic>> ingredientsForOne;

  _ParsedRecipe({required this.cleanText, required this.ingredientsForOne});
}

/// Ham Gemini çıktısından [MALZEMELER_JSON_START]...[MALZEMELER_JSON_END]
/// bloğunu ayırır; JSON parse edilebilirse porsiyon listesini döner.
_ParsedRecipe _parseRawSuggestion(String raw) {
  const startTag = '[MALZEMELER_JSON_START]';
  const endTag = '[MALZEMELER_JSON_END]';
  final startIdx = raw.indexOf(startTag);
  final endIdx = raw.indexOf(endTag);

  if (startIdx == -1 || endIdx == -1) {
    return _ParsedRecipe(cleanText: raw.trim(), ingredientsForOne: []);
  }

  final cleanText = raw.substring(0, startIdx).trim();
  final jsonStr = raw.substring(startIdx + startTag.length, endIdx).trim();

  try {
    final parsed = jsonDecode(jsonStr) as Map<String, dynamic>;
    final list = (parsed['ingredients_for_one'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];
    return _ParsedRecipe(cleanText: cleanText, ingredientsForOne: list);
  } catch (_) {
    return _ParsedRecipe(cleanText: cleanText, ingredientsForOne: []);
  }
}

class _RecipeResultCardState extends State<RecipeResultCard> {
  late _ParsedRecipe _parsed;
  int _servings = 1;
  bool _deducting = false;
  Map<String, dynamic>? _deductResult;
  String? _deductError;

  @override
  void initState() {
    super.initState();
    _parsed = _parseRawSuggestion(widget.rawSuggestion);
  }

  @override
  void didUpdateWidget(covariant RecipeResultCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.rawSuggestion != widget.rawSuggestion) {
      setState(() {
        _parsed = _parseRawSuggestion(widget.rawSuggestion);
        _servings = 1;
        _deducting = false;
        _deductResult = null;
        _deductError = null;
      });
    }
  }

  Future<void> _handleDeduct() async {
    if (_parsed.ingredientsForOne.isEmpty) return;
    setState(() {
      _deducting = true;
      _deductResult = null;
      _deductError = null;
    });
    try {
      final result = await DietaryPreferencesService.deductRecipeStock(
        ingredients: _parsed.ingredientsForOne,
        servings: _servings,
      );
      setState(() => _deductResult = result);
    } catch (e) {
      setState(() => _deductError = e.toString());
    } finally {
      setState(() => _deducting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF2C2C2E) : Colors.white;
    final purple = const Color(0xFF7C3AED);
    final pink = const Color(0xFFEC4899);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Temiz tarif metni ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(16),
          ),
          child: SelectableText(
            _parsed.cleanText,
            style: TextStyle(fontSize: 15, height: 1.7, color: theme.colorScheme.onSurface),
          ),
        ),

        // ── 1 Kişilik Porsiyon Kartı ──
        if (_parsed.ingredientsForOne.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: purple.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.people_outline, color: purple, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      '1 Kişilik Porsiyon Miktarları',
                      style: TextStyle(fontWeight: FontWeight.bold, color: purple, fontSize: 14),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ..._parsed.ingredientsForOne.map((ing) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: Text(
                              ing['product_name']?.toString() ?? '',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              '${ing['quantity']} ${ing['unit']}',
                              style: TextStyle(
                                color: theme.colorScheme.onSurface.withOpacity(0.6),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )),
                const Divider(height: 20),

                // ── Porsiyon seçici ──
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Kaç kişilik yaptınız?',
                            style: TextStyle(
                              fontSize: 13,
                              color: theme.colorScheme.onSurface.withOpacity(0.6),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _ServingsButton(
                                icon: Icons.remove,
                                onTap: () => setState(() => _servings = (_servings - 1).clamp(1, 20)),
                              ),
                              Container(
                                width: 40,
                                alignment: Alignment.center,
                                child: Text(
                                  '$_servings',
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              _ServingsButton(
                                icon: Icons.add,
                                onTap: () => setState(() => _servings = (_servings + 1).clamp(1, 20)),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'kişilik',
                                style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.6)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ── Tarifi Yaptım butonu ──
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: (_deducting || _deductResult != null) ? null : _handleDeduct,
                    icon: _deducting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Icon(_deductResult != null ? Icons.check_circle : Icons.restaurant_menu),
                    label: Text(
                      _deducting
                          ? 'Güncelleniyor…'
                          : _deductResult != null
                              ? 'Stok Güncellendi ✓'
                              : 'Tarifi Yaptım! Stoğu Güncelle',
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      backgroundColor: _deductResult != null ? Colors.green.shade600 : purple,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: _deductResult != null ? Colors.green.shade600 : Colors.grey.shade400,
                      disabledForegroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      textStyle: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),

                if (_deductError != null) ...[
                  const SizedBox(height: 8),
                  _AlertBox(
                    icon: Icons.error_outline,
                    color: Colors.red,
                    message: _deductError!,
                  ),
                ],

                // ── Stok Düşüm Sonuçları ──
                if (_deductResult != null) ...[
                  const SizedBox(height: 12),
                  _buildDeductResults(_deductResult!, theme, purple, pink),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDeductResults(
    Map<String, dynamic> result,
    ThemeData theme,
    Color purple,
    Color pink,
  ) {
    final deducted = (result['deducted'] as List?) ?? [];
    final lowStock = (result['low_stock'] as List?) ?? [];
    final depleted = (result['depleted'] as List?) ?? [];
    final buySuggestions = (result['buy_suggestions'] as List?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (deducted.isNotEmpty)
          _AlertBox(
            icon: Icons.check_circle_outline,
            color: Colors.green,
            message:
                '${deducted.length} ürünün stoğu güncellendi: ${deducted.map((d) => '${d['name']} (${d['new_qty']} kaldı)').join(' · ')}',
          ),
        if (lowStock.isNotEmpty) ...[
          const SizedBox(height: 6),
          _AlertBox(
            icon: Icons.warning_amber_outlined,
            color: Colors.orange,
            message:
                'Az kalan ürünler: ${lowStock.map((l) => '${l['name']} (${l['quantity']} adet)').join(', ')}',
          ),
        ],
        if (depleted.isNotEmpty) ...[
          const SizedBox(height: 6),
          _AlertBox(
            icon: Icons.do_not_disturb_on_outlined,
            color: Colors.red,
            message: 'Stoktan biten ürünler: ${(depleted).join(', ')}',
          ),
        ],
        if (buySuggestions.isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.07),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.orange.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.shopping_cart_outlined, color: Colors.orange, size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      'Mağazadan Temin Edebilirsiniz',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ...buySuggestions.map((s) {
                  final reason = s['reason'] as String? ?? '';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: s['image_url'] != null && s['image_url'].toString().isNotEmpty
                              ? Image.network(
                                  s['image_url'].toString(),
                                  width: 40,
                                  height: 40,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const _FallbackIcon(),
                                )
                              : const _FallbackIcon(),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                s['store_name']?.toString() ?? s['name']?.toString() ?? '',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              Text(
                                reason == 'bitti'
                                    ? 'Stoğunuzda bitti'
                                    : reason == 'azaldi'
                                        ? 'Sadece ${s['quantity']} adet kaldı'
                                        : 'Stoğunuzda yok',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: reason == 'azaldi' ? Colors.orange : Colors.red,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            reason == 'azaldi' ? 'Az kaldı' : 'Bitti',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _ServingsButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _ServingsButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).dividerColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18),
      ),
    );
  }
}

class _AlertBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String message;
  const _AlertBox({required this.icon, required this.color, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: TextStyle(fontSize: 13, height: 1.5))),
        ],
      ),
    );
  }
}

class _FallbackIcon extends StatelessWidget {
  const _FallbackIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(Icons.shopping_cart, color: Colors.orange, size: 20),
    );
  }
}
