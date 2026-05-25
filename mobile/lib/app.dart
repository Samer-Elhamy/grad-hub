import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/language_provider.dart';
import 'routes/app_router.dart';
import 'theme/app_theme.dart';

/// Root application widget.
///
/// Uses [MaterialApp.router] with GoRouter navigation.
/// Theme follows system dark/light mode.
class GradHubApp extends ConsumerWidget {
  const GradHubApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final language = ref.watch(languageProvider);
    return MaterialApp.router(
      title: 'Grad Projects Hub',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: AppRouter.router,
      builder: (context, child) => Directionality(
        textDirection:
            language.isArabic ? TextDirection.rtl : TextDirection.ltr,
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
