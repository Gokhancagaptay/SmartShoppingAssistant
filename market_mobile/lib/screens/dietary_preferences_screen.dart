import 'package:flutter/material.dart';
import '../services/dietary_preferences_service.dart';

/// Kullanıcının diyet tercihlerini yönettiği ekran.
/// Hazır etiketlerden seçim + serbest metin girişi içerir.
class DietaryPreferencesScreen extends StatefulWidget {
  const DietaryPreferencesScreen({super.key});

  @override
  State<DietaryPreferencesScreen> createState() => _DietaryPreferencesScreenState();
}

class _DietaryPreferencesScreenState extends State<DietaryPreferencesScreen> {
  bool _loading = true;
  bool _saving = false;
  List<String> _selectedTags = [];
  final TextEditingController _noteController = TextEditingController();
  List<String> _initialTags = [];
  String _initialNote = '';

  /// Hazır diyet etiketleri
  static const _dietTags = [
    {'id': 'vejetaryen', 'label': 'Vejetaryen', 'emoji': '🥗', 'desc': 'Et tüketmiyorum'},
    {'id': 'vegan', 'label': 'Vegan', 'emoji': '🌱', 'desc': 'Hayvansal ürün tüketmiyorum'},
    {'id': 'glutensiz', 'label': 'Glütensiz', 'emoji': '🌾', 'desc': 'Buğday/glüten kullanmıyorum'},
    {'id': 'düşük karbonhidrat', 'label': 'Düşük Karbonhidrat', 'emoji': '🥩', 'desc': 'Karbonhidratı kısıtlıyorum'},
    {'id': 'ketojenik', 'label': 'Ketojenik', 'emoji': '🫙', 'desc': 'Yüksek yağ, çok düşük karbonhidrat'},
    {'id': 'paleo', 'label': 'Paleo', 'emoji': '🦴', 'desc': 'İşlenmiş gıda yemiyorum'},
    {'id': 'düşük yağ', 'label': 'Düşük Yağ', 'emoji': '🫐', 'desc': 'Yağ alımımı kısıtlıyorum'},
    {'id': 'laktoz intoleranı', 'label': 'Laktoz İntoleranı', 'emoji': '🥛', 'desc': 'Süt ürünü tüketemiyorum'},
    {'id': 'diyabetik', 'label': 'Diyabetik', 'emoji': '💉', 'desc': 'Şeker ve glisemik indeks önemli'},
    {'id': 'yüksek protein', 'label': 'Yüksek Protein', 'emoji': '💪', 'desc': 'Protein alımını artırmak istiyorum'},
    {'id': 'düşük sodyum', 'label': 'Düşük Sodyum', 'emoji': '🧂', 'desc': 'Tuzu kısıtlıyorum'},
    {'id': 'intermittent fasting', 'label': 'Aralıklı Oruç', 'emoji': '⏱️', 'desc': 'Belirli saatlerde yiyorum'},
  ];

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadPreferences() async {
    setState(() => _loading = true);
    try {
      final data = await DietaryPreferencesService.fetchPreferences();
      final tags = (data['tags'] as List?)?.map((e) => e.toString()).toList() ?? [];
      final note = (data['custom_note'] as String?) ?? '';
      setState(() {
        _selectedTags = List<String>.from(tags);
        _initialTags = List<String>.from(tags);
        _noteController.text = note;
        _initialNote = note;
      });
    } catch (_) {}
    setState(() => _loading = false);
  }

  bool get _isDirty {
    final sortedNew = List<String>.from(_selectedTags)..sort();
    final sortedOld = List<String>.from(_initialTags)..sort();
    return sortedNew.join(',') != sortedOld.join(',') ||
        _noteController.text.trim() != _initialNote.trim();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await DietaryPreferencesService.savePreferences(
        tags: _selectedTags,
        customNote: _noteController.text.trim(),
      );
      setState(() {
        _initialTags = List<String>.from(_selectedTags);
        _initialNote = _noteController.text.trim();
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Tercihler kaydedildi! Tarifler artık diyetinize göre önerilecek.'),
          backgroundColor: Color(0xFF7C3AED),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardColor = isDark ? const Color(0xFF2C2C2E) : Colors.white;
    final bgColor = isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF5F5F7);
    final purple = const Color(0xFF7C3AED);
    final pink = const Color(0xFFEC4899);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: bgColor,
        elevation: 0,
        title: const Text(
          'Diyet Tercihlerim',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (_isDirty && !_saving)
            TextButton(
              onPressed: _save,
              child: Text('Kaydet', style: TextStyle(color: purple, fontWeight: FontWeight.bold)),
            ),
          if (_saving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Başlık kartı ──
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [purple.withOpacity(0.15), pink.withOpacity(0.10)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: purple.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(colors: [purple, pink]),
                            shape: BoxShape.circle,
                          ),
                          child: const Center(child: Text('🥗', style: TextStyle(fontSize: 26))),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Diyet Tercihlerim',
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text(
                                'Tercihleriniz tarif önerilerini kişiselleştirir',
                                style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface.withOpacity(0.6)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Diyet etiketleri ──
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: theme.dividerColor.withOpacity(0.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.tune, color: purple, size: 20),
                            const SizedBox(width: 8),
                            const Text('Diyet Türünü Seçin',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            const SizedBox(width: 6),
                            Tooltip(
                              message: 'Birden fazla seçebilirsiniz',
                              child: Icon(Icons.info_outline, size: 16, color: theme.colorScheme.onSurface.withOpacity(0.4)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: _dietTags.map((tag) {
                            final id = tag['id']!;
                            final selected = _selectedTags.contains(id);
                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  if (selected) {
                                    _selectedTags.remove(id);
                                  } else {
                                    _selectedTags.add(id);
                                  }
                                });
                              },
                              child: Tooltip(
                                message: tag['desc']!,
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                                  decoration: BoxDecoration(
                                    gradient: selected
                                        ? LinearGradient(colors: [purple, pink])
                                        : null,
                                    color: selected ? null : theme.colorScheme.surface,
                                    borderRadius: BorderRadius.circular(30),
                                    border: Border.all(
                                      color: selected ? Colors.transparent : theme.dividerColor,
                                      width: 1.5,
                                    ),
                                    boxShadow: selected
                                        ? [BoxShadow(color: purple.withOpacity(0.35), blurRadius: 8, offset: const Offset(0, 3))]
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (selected)
                                        const Padding(
                                          padding: EdgeInsets.only(right: 4),
                                          child: Icon(Icons.check, size: 14, color: Colors.white),
                                        ),
                                      Text(
                                        '${tag['emoji']} ${tag['label']}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13,
                                          color: selected ? Colors.white : theme.colorScheme.onSurface,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        if (_selectedTags.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: purple.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: purple.withOpacity(0.2)),
                            ),
                            child: Text(
                              'Seçilen: ${_selectedTags.join(' · ')}',
                              style: TextStyle(color: purple, fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Özel not ──
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: theme.dividerColor.withOpacity(0.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Ek Notlar & Kısıtlamalar',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 4),
                        Text(
                          'Alerjilerinizi veya özel isteklerinizi yazın.',
                          style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface.withOpacity(0.6)),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _noteController,
                          maxLines: 3,
                          maxLength: 400,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText:
                                'Örn: "Fıstığa alerjim var, acılı yemekler istemiyorum..."',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: purple, width: 2),
                            ),
                            filled: true,
                            fillColor: theme.colorScheme.surface,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Bilgi kutusu ──
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.07),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.blue.withOpacity(0.2)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('💡', style: TextStyle(fontSize: 20)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Bu tercihler nasıl kullanılır?',
                                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                              const SizedBox(height: 6),
                              Text(
                                'Stok analizi ve tarif önerileri sırasında AI, diyet tercihlerinizi göz önünde bulundurur. '
                                '"Düşük karbonhidrat" seçtiyseniz ekmek bazlı tarifler yerine protein ağırlıklı öneriler sunar. '
                                'Sepet danışmanı da tercihlerinizi bilerek yanıt verir.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: theme.colorScheme.onSurface.withOpacity(0.7),
                                  height: 1.6,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── Kaydet butonu ──
                  SizedBox(
                    width: double.infinity,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      child: ElevatedButton.icon(
                        onPressed: _isDirty && !_saving ? _save : null,
                        icon: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.save_rounded),
                        label: Text(_saving ? 'Kaydediliyor…' : 'Tercihleri Kaydet'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          backgroundColor: _isDirty ? purple : Colors.grey.shade400,
                          foregroundColor: Colors.white,
                          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }
}
