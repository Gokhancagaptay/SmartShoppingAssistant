import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Uygulamanın merkezi tema sistemi.
/// Web frontend (Next.js) ile aynı renk paleti kullanılmaktadır.
/// Ekranlarda doğrudan renk kodu kullanmak yerine
/// Theme.of(context).colorScheme değişkenlerini tercih edin.
class AppTheme {
  // --- Renk sabitleri (web frontend ile eşleştirildi) ---
  static const Color primaryColor = Color(0xFF6366F1);      // Indigo
  static const Color primaryDarkColor = Color(0xFF818CF8);  // Açık indigo (dark temada)
  static const Color primaryDeepColor = Color(0xFF4F46E5);  // Koyu indigo
  static const Color secondaryColor = Color(0xFF10B981);    // Emerald yeşil
  static const Color secondaryDarkColor = Color(0xFF34D399); // Açık yeşil (dark temada)
  static const Color accentPurple = Color(0xFF8B5CF6);      // Mor vurgu (gradient için)
  static const Color errorColor = Color(0xFFEF4444);
  static const Color warningColor = Color(0xFFF59E0B);
  static const Color successColor = Color(0xFF10B981);

  // Açık tema yüzeyleri
  /// Göz yormayan, düşük parlaklıklı açık arka plan (web ile uyumlu).
  static const Color lightBackground = Color(0xFFE9EBF0);
  static const Color lightSurface = Colors.white;
  static const Color lightCardBorder = Color(0x0F000000);   // %6 siyah

  // Koyu tema yüzeyleri
  static const Color darkBackground = Color(0xFF0B0F19);
  static const Color darkSurface = Color(0xFF131929);
  static const Color darkCardColor = Color(0xFF1A2235);
  static const Color darkBorder = Color(0x14FFFFFF);        // %8 beyaz

  // Gradient tanımı (buton + vurgu için)
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryColor, accentPurple],
  );

  static const LinearGradient primaryGradientHover = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryDeepColor, Color(0xFF7C3AED)],
  );

  // -------------------------------------------------------
  // AÇIK TEMA
  // -------------------------------------------------------
  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
      primary: primaryColor,
      secondary: secondaryColor,
      surface: lightSurface,
      error: errorColor,
    ),
    scaffoldBackgroundColor: lightBackground,

    textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme).copyWith(
      headlineLarge: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
      headlineMedium: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.3),
      titleLarge: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      titleMedium: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      bodyLarge: const TextStyle(fontSize: 15, height: 1.65),
      bodyMedium: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.6),
      labelLarge: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: 0.1),
    ),

    appBarTheme: AppBarTheme(
      backgroundColor: lightSurface,
      foregroundColor: const Color(0xFF0F172A),
      elevation: 0,
      shadowColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: const Color(0xFF0F172A),
        letterSpacing: -0.3,
      ),
      iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
    ),

    cardTheme: CardThemeData(
      color: lightSurface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: lightCardBorder),
      ),
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14, letterSpacing: 0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        elevation: 0,
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primaryColor,
        side: const BorderSide(color: primaryColor),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primaryColor,
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
      labelStyle: const TextStyle(color: primaryColor, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[200]!),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[200]!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: errorColor),
      ),
    ),

    chipTheme: ChipThemeData(
      labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: primaryColor,
      unselectedItemColor: Color(0xFF94A3B8),
      showSelectedLabels: true,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),

    dividerTheme: DividerThemeData(
      color: Colors.grey[100],
      thickness: 1,
      space: 1,
    ),

    iconTheme: const IconThemeData(color: primaryColor, size: 24),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF1E293B),
      contentTextStyle: GoogleFonts.inter(color: Colors.white, fontSize: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),
  );

  // -------------------------------------------------------
  // KOYU TEMA
  // -------------------------------------------------------
  static final ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
      primary: primaryDarkColor,
      secondary: secondaryDarkColor,
      surface: darkSurface,
      error: errorColor,
    ),
    scaffoldBackgroundColor: darkBackground,

    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).apply(
      bodyColor: const Color(0xFFF1F5F9),
      displayColor: const Color(0xFFF1F5F9),
    ).copyWith(
      headlineLarge: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: Color(0xFFF1F5F9)),
      headlineMedium: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.3, color: Color(0xFFF1F5F9)),
      titleLarge: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Color(0xFFF1F5F9)),
      bodyMedium: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8), height: 1.6),
    ),

    appBarTheme: AppBarTheme(
      backgroundColor: darkSurface,
      foregroundColor: const Color(0xFFF1F5F9),
      elevation: 0,
      shadowColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: const Color(0xFFF1F5F9),
        letterSpacing: -0.3,
      ),
      iconTheme: const IconThemeData(color: Color(0xFFF1F5F9)),
    ),

    cardTheme: CardThemeData(
      color: darkCardColor,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: darkBorder),
      ),
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryDarkColor,
        foregroundColor: Colors.white,
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14, letterSpacing: 0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        elevation: 0,
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primaryDarkColor,
        side: const BorderSide(color: primaryDarkColor),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primaryDarkColor,
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF1E293B),
      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
      labelStyle: const TextStyle(color: primaryDarkColor, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryDarkColor, width: 2),
      ),
      prefixIconColor: const Color(0xFF64748B),
    ),

    chipTheme: ChipThemeData(
      labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: darkSurface,
      selectedItemColor: primaryDarkColor,
      unselectedItemColor: Color(0xFF64748B),
      showSelectedLabels: true,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),

    dividerTheme: const DividerThemeData(
      color: Color(0xFF1E293B),
      thickness: 1,
      space: 1,
    ),

    dataTableTheme: DataTableThemeData(
      headingRowColor: WidgetStateProperty.all(const Color(0xFF1E293B)),
      headingTextStyle: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF1F5F9)),
      dataRowColor: WidgetStateProperty.all(darkSurface),
      dataTextStyle: const TextStyle(color: Color(0xFF94A3B8)),
    ),

    iconTheme: const IconThemeData(color: primaryDarkColor, size: 24),
    dividerColor: const Color(0xFF1E293B),

    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF1E293B),
      contentTextStyle: GoogleFonts.inter(color: Colors.white, fontSize: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
