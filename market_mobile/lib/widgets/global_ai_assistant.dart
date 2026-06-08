import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/analysis_service.dart';
import '../services/stock_service.dart';
import '../theme/app_theme.dart';

class GlobalAiAssistant extends StatefulWidget {
  const GlobalAiAssistant({super.key});

  @override
  State<GlobalAiAssistant> createState() => _GlobalAiAssistantState();
}

class _GlobalAiAssistantState extends State<GlobalAiAssistant> {
  static const _quickQuestions = [
    'Stoğumda ne eksik?',
    'Haftalık alışveriş listesi öner',
    'Beslenme önerileri ver',
    'En çok hangi besinleri tüketmeliyim?',
    'Diyet programım için ne önerirsin?',
    'Bütçeme uygun alışveriş nasıl yapabilirim?',
  ];

  final List<_ChatMessage> _messages = [];
  final TextEditingController _ctrl = TextEditingController();
  final ScrollController _scroll = ScrollController();
  bool _loading = false;

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send(String question) async {
    if (question.trim().isEmpty || _loading) return;
    _ctrl.clear();
    setState(() {
      _messages.add(_ChatMessage(text: question, isUser: true));
      _loading = true;
    });
    _scrollToBottom();
    try {
      final stockItems = await StockService.fetchUserStock();
      final names = stockItems.map((i) => i['name'].toString()).toList();
      final answer = await AnalysisService.customQuestion(names, question);
      if (mounted) {
        setState(() {
          _messages.add(_ChatMessage(text: answer, isUser: false));
          _loading = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(_ChatMessage(
              text: 'Bir hata oluştu: $e', isUser: false, isError: true));
          _loading = false;
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final height = MediaQuery.of(context).size.height * 0.75;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkSurface : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          _buildHandle(isDark),
          _buildHeader(isDark),
          if (_messages.isEmpty) _buildQuickChips(isDark),
          Expanded(child: _buildMessageList(isDark)),
          if (_loading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? AppTheme.darkCardColor : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ],
              ),
            ),
          _buildInput(isDark),
        ],
      ),
    );
  }

  Widget _buildHandle(bool isDark) {
    return Container(
      margin: const EdgeInsets.only(top: 12, bottom: 4),
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF334155) : Colors.grey[300],
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 10),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('AI Asistan',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              Text('Sana nasıl yardımcı olabilirim?',
                  style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
            ],
          ),
          const Spacer(),
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline, size: 20),
              onPressed: () => setState(() => _messages.clear()),
              tooltip: 'Sohbeti Temizle',
            ),
        ],
      ),
    );
  }

  Widget _buildQuickChips(bool isDark) {
    return SizedBox(
      height: 48,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _quickQuestions.length,
        itemBuilder: (_, i) => Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ActionChip(
            label: Text(_quickQuestions[i],
                style: const TextStyle(fontSize: 12)),
            backgroundColor: isDark
                ? AppTheme.primaryColor.withValues(alpha: 0.15)
                : AppTheme.primaryColor.withValues(alpha: 0.08),
            labelStyle: TextStyle(
                color: isDark ? AppTheme.primaryDarkColor : AppTheme.primaryColor),
            onPressed: () => _send(_quickQuestions[i]),
          ),
        ),
      ),
    );
  }

  Widget _buildMessageList(bool isDark) {
    if (_messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline,
                size: 48,
                color: isDark ? const Color(0xFF334155) : Colors.grey[300]),
            const SizedBox(height: 8),
            Text('Bir soru sor veya yukarıdan seç',
                style: TextStyle(
                    color: isDark ? const Color(0xFF64748B) : Colors.grey[400],
                    fontSize: 13)),
          ],
        ),
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: _messages.length,
      itemBuilder: (_, i) => _MessageBubble(
          message: _messages[i], isDark: isDark),
    );
  }

  Widget _buildInput(bool isDark) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 12,
          right: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 8,
          top: 8,
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _ctrl,
                decoration: const InputDecoration(
                  hintText: 'Soru sor...',
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: _send,
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _loading ? null : () => _send(_ctrl.text),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: _loading ? null : AppTheme.primaryGradient,
                  color: _loading
                      ? (isDark ? const Color(0xFF334155) : Colors.grey[200])
                      : null,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.send_rounded,
                  color: _loading ? Colors.grey : Colors.white,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatMessage {
  final String text;
  final bool isUser;
  final bool isError;
  const _ChatMessage(
      {required this.text, required this.isUser, this.isError = false});
}

class _MessageBubble extends StatelessWidget {
  final _ChatMessage message;
  final bool isDark;

  const _MessageBubble({required this.message, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser)
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(right: 8, top: 2),
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
            ),
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                gradient: isUser ? AppTheme.primaryGradient : null,
                color: isUser
                    ? null
                    : (message.isError
                        ? AppTheme.errorColor.withValues(alpha: 0.1)
                        : (isDark
                            ? AppTheme.darkCardColor
                            : const Color(0xFFF1F5F9))),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
              ),
              child: isUser
                  ? Text(message.text,
                      style: const TextStyle(color: Colors.white, fontSize: 14))
                  : MarkdownBody(
                      data: message.text,
                      styleSheet: MarkdownStyleSheet(
                        p: TextStyle(
                            fontSize: 14,
                            color: message.isError
                                ? AppTheme.errorColor
                                : (isDark
                                    ? const Color(0xFFF1F5F9)
                                    : const Color(0xFF0F172A))),
                      ),
                    ),
            ),
          ),
          if (isUser)
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(left: 8, top: 2),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.person_rounded,
                  size: 16,
                  color:
                      isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
            ),
        ],
      ),
    );
  }
}

// Convenience FAB to launch the assistant
class AiFab extends StatelessWidget {
  const AiFab({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return FloatingActionButton(
      heroTag: 'ai_fab',
      onPressed: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => const GlobalAiAssistant(),
        );
      },
      backgroundColor: isDark ? AppTheme.darkCardColor : Colors.white,
      elevation: 4,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          gradient: AppTheme.primaryGradient,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
      ),
    );
  }
}
