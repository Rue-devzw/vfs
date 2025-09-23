import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'src/store/cart/cart_controller.dart';
import 'src/store/view/store_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider<CartController>(
      create: (_) => CartController(),
      child: const EValleyStoreApp(),
    ),
  );
}

class EValleyStoreApp extends StatelessWidget {
  const EValleyStoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = _appColorScheme;
    final TextTheme baseTextTheme =
        ThemeData(brightness: Brightness.light, useMaterial3: true).textTheme;
    final TextTheme textTheme = _buildTextTheme(baseTextTheme, colorScheme);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'E-Valley Store',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        textTheme: textTheme,
        scaffoldBackgroundColor: colorScheme.background,
        appBarTheme: AppBarTheme(
          backgroundColor: colorScheme.background,
          foregroundColor: colorScheme.onBackground,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: textTheme.titleLarge,
        ),
        cardTheme: CardThemeData(
          color: colorScheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
      ),
      home: const StoreHomePage(),
    );
  }
}

class StoreHomePage extends StatelessWidget {
  const StoreHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('E-Valley Store'),
      ),
      body: const StoreScreen(),
    );
  }
}

TextTheme _buildTextTheme(TextTheme base, ColorScheme colorScheme) {
  final TextTheme poppinsBase = GoogleFonts.poppinsTextTheme(base);
  final TextTheme alegreyaBase = GoogleFonts.alegreyaTextTheme(base);

  return poppinsBase.copyWith(
    displayLarge: alegreyaBase.displayLarge?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: 0,
    ),
    displayMedium: alegreyaBase.displayMedium?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
    ),
    displaySmall: alegreyaBase.displaySmall?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
    ),
    headlineLarge: alegreyaBase.headlineLarge?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: 0,
    ),
    headlineMedium: alegreyaBase.headlineMedium?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
    ),
    headlineSmall: alegreyaBase.headlineSmall?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
    ),
    titleLarge: alegreyaBase.titleLarge?.copyWith(
      fontWeight: FontWeight.w600,
    ),
    titleMedium: poppinsBase.titleMedium?.copyWith(
      fontWeight: FontWeight.w500,
    ),
    titleSmall: poppinsBase.titleSmall?.copyWith(
      fontWeight: FontWeight.w500,
    ),
    bodyLarge: poppinsBase.bodyLarge?.copyWith(
      fontWeight: FontWeight.w400,
    ),
    bodyMedium: poppinsBase.bodyMedium?.copyWith(
      fontWeight: FontWeight.w400,
    ),
    bodySmall: poppinsBase.bodySmall?.copyWith(
      fontWeight: FontWeight.w400,
    ),
    labelLarge: poppinsBase.labelLarge?.copyWith(
      fontWeight: FontWeight.w500,
    ),
    labelMedium: poppinsBase.labelMedium?.copyWith(
      fontWeight: FontWeight.w500,
    ),
    labelSmall: poppinsBase.labelSmall?.copyWith(
      fontWeight: FontWeight.w500,
    ),
  ).apply(
    bodyColor: colorScheme.onBackground,
    displayColor: colorScheme.onBackground,
  );
}

const ColorScheme _appColorScheme = ColorScheme(
  brightness: Brightness.light,
  primary: Color(0xFF5A842A),
  onPrimary: Color(0xFFF3F6EE),
  primaryContainer: Color(0xFF9CC36F),
  onPrimaryContainer: Color(0xFF202F0F),
  secondary: Color(0xFF98582A),
  onSecondary: Color(0xFFF6F2EE),
  secondaryContainer: Color(0xFFC29270),
  onSecondaryContainer: Color(0xFF402512),
  tertiary: Color(0xFFCE814B),
  onTertiary: Color(0xFF2B1607),
  tertiaryContainer: Color(0xFFF3B783),
  onTertiaryContainer: Color(0xFF2F1500),
  error: Color(0xFFBA1A1A),
  onError: Color(0xFFFFFFFF),
  errorContainer: Color(0xFFFFDAD6),
  onErrorContainer: Color(0xFF410002),
  background: Color(0xFFFCFAF8),
  onBackground: Color(0xFF0C0A09),
  surface: Color(0xFFF5F5DB),
  onSurface: Color(0xFF0C0A09),
  surfaceVariant: Color(0xFFE7E7E4),
  onSurfaceVariant: Color(0xFF4F4B45),
  outline: Color(0xFF8C8173),
  outlineVariant: Color(0xFFCFC7B6),
  shadow: Color(0xFF000000),
  scrim: Color(0xFF000000),
  inverseSurface: Color(0xFF2A281F),
  onInverseSurface: Color(0xFFECE7DD),
  inversePrimary: Color(0xFFCAE8A9),
  surfaceTint: Color(0xFF5A842A),
);
