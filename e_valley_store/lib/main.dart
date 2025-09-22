import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  runApp(const EValleyStoreApp());
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
        navigationDrawerTheme: NavigationDrawerThemeData(
          backgroundColor: colorScheme.surface,
          indicatorColor: colorScheme.primaryContainer,
          indicatorShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        cardTheme: CardThemeData(
          color: colorScheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
      ),
      initialRoute: AppRoutes.home,
      routes: _appRoutes,
      onUnknownRoute: (settings) => MaterialPageRoute<void>(
        builder: (context) => const AppShell(selectedIndex: 0),
      ),
    );
  }
}

class AppRoutes {
  static const String home = '/';
  static const String producers = '/producers';
  static const String services = '/services';
  static const String locations = '/locations';
  static const String gallery = '/gallery';
  static const String wholesale = '/wholesale';
  static const String contact = '/contact';
  static const String store = '/store';
}

class AppDestination {
  const AppDestination({
    required this.route,
    required this.label,
    required this.icon,
    this.selectedIcon,
    required this.builder,
  });

  final String route;
  final String label;
  final IconData icon;
  final IconData? selectedIcon;
  final WidgetBuilder builder;
}

final List<AppDestination> _destinations = <AppDestination>[
  AppDestination(
    route: AppRoutes.home,
    label: 'Home',
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
    builder: (context) => const HomeScreen(),
  ),
  AppDestination(
    route: AppRoutes.producers,
    label: 'Producers',
    icon: Icons.agriculture,
    builder: (context) => const ProducersScreen(),
  ),
  AppDestination(
    route: AppRoutes.services,
    label: 'Services',
    icon: Icons.design_services_outlined,
    selectedIcon: Icons.design_services,
    builder: (context) => const ServicesScreen(),
  ),
  AppDestination(
    route: AppRoutes.locations,
    label: 'Locations',
    icon: Icons.location_on_outlined,
    selectedIcon: Icons.location_on,
    builder: (context) => const LocationsScreen(),
  ),
  AppDestination(
    route: AppRoutes.gallery,
    label: 'Gallery',
    icon: Icons.photo_library_outlined,
    selectedIcon: Icons.photo_library,
    builder: (context) => const GalleryScreen(),
  ),
  AppDestination(
    route: AppRoutes.wholesale,
    label: 'Wholesale',
    icon: Icons.inventory_2_outlined,
    selectedIcon: Icons.inventory_2,
    builder: (context) => const WholesaleScreen(),
  ),
  AppDestination(
    route: AppRoutes.contact,
    label: 'Contact',
    icon: Icons.support_agent,
    builder: (context) => const ContactScreen(),
  ),
  AppDestination(
    route: AppRoutes.store,
    label: 'Store',
    icon: Icons.shopping_cart_outlined,
    selectedIcon: Icons.shopping_cart,
    builder: (context) => const StoreScreen(),
  ),
];

final Map<String, WidgetBuilder> _appRoutes = <String, WidgetBuilder>{
  for (var i = 0; i < _destinations.length; i++)
    _destinations[i].route: (context) => AppShell(selectedIndex: i),
};

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.selectedIndex});

  final int selectedIndex;

  @override
  Widget build(BuildContext context) {
    final AppDestination destination = _destinations[selectedIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text(destination.label),
      ),
      drawer: NavigationDrawer(
        selectedIndex: selectedIndex,
        onDestinationSelected: (int index) {
          final navigator = Navigator.of(context);
          navigator.pop();
          if (index != selectedIndex) {
            navigator.pushReplacementNamed(_destinations[index].route);
          }
        },
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 24, 16, 12),
            child: Text(
              'E-Valley Store',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const Divider(indent: 16, endIndent: 16),
          ...List<Widget>.generate(_destinations.length, (int index) {
            final AppDestination destination = _destinations[index];
            return NavigationDrawerDestination(
              icon: Icon(destination.icon),
              selectedIcon: Icon(destination.selectedIcon ?? destination.icon),
              label: Text(destination.label),
            );
          }),
        ],
      ),
      body: SafeArea(
        child: destination.builder(context),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Home',
      message:
          'Welcome to E-Valley Store. This home hub will highlight featured '
          'stories, announcements, and quick navigation as the experience grows.',
    );
  }
}

class ProducersScreen extends StatelessWidget {
  const ProducersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Producers',
      message:
          'Resources and programs tailored for agricultural producers will '
          'appear in this section.',
    );
  }
}

class ServicesScreen extends StatelessWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Services',
      message:
          'Service offerings, support packages, and onboarding guidance will '
          'be introduced here.',
    );
  }
}

class LocationsScreen extends StatelessWidget {
  const LocationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Locations',
      message:
          'A directory of distribution centers and retail locations will be '
          'mapped in this area.',
    );
  }
}

class GalleryScreen extends StatelessWidget {
  const GalleryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Gallery',
      message:
          'Imagery, storytelling, and product showcases will populate the '
          'gallery soon.',
    );
  }
}

class WholesaleScreen extends StatelessWidget {
  const WholesaleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Wholesale',
      message:
          'Information about bulk ordering, pricing tiers, and distributor '
          'support will live in the wholesale view.',
    );
  }
}

class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Contact',
      message:
          'Contact details, inquiry forms, and support options will be added '
          'here.',
    );
  }
}

class StoreScreen extends StatelessWidget {
  const StoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SectionPlaceholder(
      title: 'Store',
      message:
          'The future online storefront and shopping tools will appear in this '
          'space.',
    );
  }
}

class SectionPlaceholder extends StatelessWidget {
  const SectionPlaceholder({
    super.key,
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints _) {
        return Align(
          alignment: Alignment.topCenter,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: Card(
                elevation: 0,
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: <Widget>[
                      Text(
                        title,
                        style: theme.textTheme.headlineLarge,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        message,
                        style: theme.textTheme.bodyLarge,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
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
