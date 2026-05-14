import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Uygulama geneli tema modu; [MaterialApp] üst bileşeninde [appThemeMode] dinlenir.
final ValueNotifier<ThemeMode> appThemeMode = ValueNotifier<ThemeMode>(ThemeMode.system);

const _kThemePref = 'theme_mode';

Future<void> loadPersistedThemeMode() async {
  final prefs = await SharedPreferences.getInstance();
  final v = prefs.getString(_kThemePref);
  if (v == 'light') {
    appThemeMode.value = ThemeMode.light;
  } else if (v == 'dark') {
    appThemeMode.value = ThemeMode.dark;
  } else {
    appThemeMode.value = ThemeMode.system;
  }
}

Future<void> setAppThemeMode(ThemeMode mode) async {
  final prefs = await SharedPreferences.getInstance();
  String key;
  if (mode == ThemeMode.light) {
    key = 'light';
  } else if (mode == ThemeMode.dark) {
    key = 'dark';
  } else {
    key = 'system';
  }
  await prefs.setString(_kThemePref, key);
  appThemeMode.value = mode;
}
