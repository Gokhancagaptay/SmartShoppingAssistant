import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'providers/cart_provider.dart';
import 'providers/favorites_provider.dart';
import 'screens/product_list.dart';
import 'screens/register_screen.dart';
import 'screens/login_screen.dart' show LoginScreen;
import 'screens/dietary_preferences_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/favorites_screen.dart';
import 'screens/recipes_screen.dart';
import 'screens/nutrition_screen.dart';
import 'theme/app_theme.dart';
import 'theme/theme_mode_holder.dart';
import 'package:market_mobile/admin_panel/admin_main.dart';
import 'package:market_mobile/admin_panel/admin_route_guard.dart';

/// Web'de içeriği ortalar; geniş ekranda daha yüksek maksimum genişlik kullanır.
Widget responsiveWrapper({
  required BuildContext context,
  required Widget child,
}) {
  return LayoutBuilder(
    builder: (context, constraints) {
      if (!kIsWeb) return child;
      final w = constraints.maxWidth;
      double maxW = 560;
      if (w >= 1200) {
        maxW = 1200;
      } else if (w >= 900) {
        maxW = 880;
      } else if (w >= 720) {
        maxW = 680;
      }
      if (w > maxW + 48) {
        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxW),
            child: child,
          ),
        );
      }
      return child;
    },
  );
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('tr_TR', null);
  await loadPersistedThemeMode();

  const firebaseApiKey = String.fromEnvironment('FIREBASE_WEB_API_KEY', defaultValue: '');
  const firebaseAuthDomain = String.fromEnvironment('FIREBASE_AUTH_DOMAIN', defaultValue: '');
  const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID', defaultValue: '');
  const firebaseStorageBucket = String.fromEnvironment('FIREBASE_STORAGE_BUCKET', defaultValue: '');
  const firebaseMessagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID', defaultValue: '');
  const firebaseAppIdWeb = String.fromEnvironment('FIREBASE_APP_ID_WEB', defaultValue: '');
  const firebaseDatabaseURL = String.fromEnvironment('FIREBASE_DATABASE_URL', defaultValue: '');

  if (Firebase.apps.isEmpty) {
    if (kIsWeb) {
      if (firebaseApiKey.isEmpty || firebaseProjectId.isEmpty) {
        debugPrint(
          'Firebase web: --dart-define ile FIREBASE_WEB_API_KEY ve FIREBASE_PROJECT_ID (ve diğer alanlar) tanımlayın.',
        );
      } else {
        await Firebase.initializeApp(
          options: FirebaseOptions(
            apiKey: firebaseApiKey,
            authDomain: firebaseAuthDomain,
            projectId: firebaseProjectId,
            storageBucket: firebaseStorageBucket,
            messagingSenderId: firebaseMessagingSenderId,
            appId: firebaseAppIdWeb,
            databaseURL: firebaseDatabaseURL,
          ),
        );
      }
    } else {
      await Firebase.initializeApp();
    }
  }

  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _isLoggedIn = false;
  bool _isLoading = true;
  String? _userRole;

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
    appThemeMode.addListener(_onThemeMode);
  }

  @override
  void dispose() {
    appThemeMode.removeListener(_onThemeMode);
    super.dispose();
  }

  void _onThemeMode() => setState(() {});

  Future<void> _checkLoginStatus() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _isLoggedIn = prefs.getBool('isLoggedIn') ?? false;
      _userRole = prefs.getString('userRole');
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Online Market',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: appThemeMode.value,
        home: _buildHome(),
        routes: {
          '/register': (context) => const RegisterScreen(),
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const DashboardScreen(),
          '/products': (context) => const ProductListPage(),
          '/preferences': (context) => const DietaryPreferencesScreen(),
          '/favorites': (context) => const FavoritesScreen(),
          '/recipes': (context) => const RecipesScreen(),
          '/nutrition': (context) => const NutritionScreen(),
        },
        onGenerateRoute: (settings) {
          if (settings.name == '/admin') {
            return MaterialPageRoute(
              builder: (context) => const AdminRouteGuard(),
            );
          }
          return null;
        },
      ),
    );
  }

  Widget _buildHome() {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!_isLoggedIn) return const LoginScreen();
    if (_userRole == 'admin') return const AdminMain();
    return const DashboardScreen();
  }
}
