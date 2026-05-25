import 'package:flutter/material.dart';

/// Spacing constants matching the design system's 4px base scale.
class AppSpacing {
  AppSpacing._();

  static const double xs = 4; // --space-1
  static const double sm = 8; // --space-2
  static const double md = 12; // --space-3
  static const double lg = 16; // --space-4
  static const double xl = 24; // --space-6
  static const double xxl = 32; // --space-8
  static const double section = 48; // --space-12
}

/// Design system colors for Grad Projects Hub v3.
///
/// Values match:
///   - docs/design-tokens.md
///   - web/src/styles/colors.css
abstract class AppColors {
  AppColors._();

  // Primary — calm blue
  static const Color primaryLight = Color(0xFF3B82F6);
  static const Color primaryDark = Color(0xFF60A5FA);

  // Secondary — purple accent
  static const Color secondaryLight = Color(0xFF8B5CF6);
  static const Color secondaryDark = Color(0xFFA78BFA);

  // Semantic
  static const Color successLight = Color(0xFF10B981);
  static const Color successDark = Color(0xFF34D399);
  static const Color errorLight = Color(0xFFEF4444);
  static const Color errorDark = Color(0xFFF87171);
  static const Color warning = Color(0xFFF59E0B);

  // Surfaces (light)
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceAltLight = Color(0xFFF9FAFB);
  static const Color backgroundLight = Color(0xFFF9FAFB);

  // Surfaces (dark) — GitHub-inspired
  static const Color surfaceDark = Color(0xFF161B22);
  static const Color surfaceAltDark = Color(0xFF0D1117);
  static const Color backgroundDark = Color(0xFF0D1117);

  // Text (light)
  static const Color textPrimaryLight = Color(0xFF111827);
  static const Color textSecondaryLight = Color(0xFF6B7280);
  static const Color textTertiaryLight = Color(0xFF9CA3AF);

  // Text (dark)
  static const Color textPrimaryDark = Color(0xFFF0F6FC);
  static const Color textSecondaryDark = Color(0xFF8B949E);
  static const Color textTertiaryDark = Color(0xFF6E7681);

  // Borders
  static const Color borderLight = Color(0xFFE5E7EB);
  static const Color borderDark = Color(0xFF30363D);
}

/// Theme factory for Grad Projects Hub v3.
///
/// Returns light or dark ThemeData matching the design system tokens.
class AppTheme {
  AppTheme._();

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.light(
        primary: AppColors.primaryLight,
        onPrimary: Colors.white,
        secondary: AppColors.secondaryLight,
        onSecondary: Colors.white,
        error: AppColors.errorLight,
        onError: Colors.white,
        surface: AppColors.surfaceLight,
        onSurface: AppColors.textPrimaryLight,
      ),
      scaffoldBackgroundColor: AppColors.backgroundLight,
      cardColor: AppColors.surfaceLight,
      dividerColor: AppColors.borderLight,
      textTheme: _buildTextTheme(Brightness.light),
      cardTheme: _cardTheme(Brightness.light) as CardThemeData,
      inputDecorationTheme: _inputDecorationTheme(Brightness.light),
      appBarTheme: _appBarTheme(Brightness.light),
      bottomNavigationBarTheme: _bottomNavTheme(Brightness.light),
      chipTheme: _chipTheme(Brightness.light),
      elevatedButtonTheme: _elevatedButtonTheme(Brightness.light),
      iconButtonTheme: _iconButtonTheme(Brightness.light),
    );
  }

  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: AppColors.primaryDark,
        onPrimary: const Color(0xFF0D1117),
        secondary: AppColors.secondaryDark,
        onSecondary: const Color(0xFF0D1117),
        error: AppColors.errorDark,
        onError: const Color(0xFF0D1117),
        surface: AppColors.surfaceDark,
        onSurface: AppColors.textPrimaryDark,
      ),
      scaffoldBackgroundColor: AppColors.backgroundDark,
      cardColor: AppColors.surfaceDark,
      dividerColor: AppColors.borderDark,
      textTheme: _buildTextTheme(Brightness.dark),
      cardTheme: _cardTheme(Brightness.dark) as CardThemeData,
      inputDecorationTheme: _inputDecorationTheme(Brightness.dark),
      appBarTheme: _appBarTheme(Brightness.dark),
      bottomNavigationBarTheme: _bottomNavTheme(Brightness.dark),
      chipTheme: _chipTheme(Brightness.dark),
      elevatedButtonTheme: _elevatedButtonTheme(Brightness.dark),
      iconButtonTheme: _iconButtonTheme(Brightness.dark),
    );
  }

  static TextTheme _buildTextTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return TextTheme(
      headlineLarge: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 36,
        fontWeight: FontWeight.w700,
        height: 1.2,
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      headlineMedium: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 30,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      titleLarge: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 24,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      titleMedium: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 20,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      titleSmall: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 18,
        fontWeight: FontWeight.w500,
        height: 1.2,
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      bodyLarge: TextStyle(
        fontFamily: 'system-ui',
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      bodyMedium: TextStyle(
        fontFamily: 'system-ui',
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color:
            isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
      ),
      bodySmall: TextStyle(
        fontFamily: 'system-ui',
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color:
            isDark ? AppColors.textTertiaryDark : AppColors.textTertiaryLight,
      ),
      labelLarge: TextStyle(
        fontFamily: 'system-ui',
        fontSize: 14,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.4,
        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      labelSmall: TextStyle(
        fontFamily: 'system-ui',
        fontSize: 12,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.4,
        color:
            isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
      ),
    );
  }

  static CardTheme _cardTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return CardTheme(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      elevation: isDark ? 0 : 0,
      shadowColor: Colors.black.withAlpha(isDark ? 77 : 26),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          width: 0.5,
        ),
      ),
      margin: EdgeInsets.zero,
    );
  }

  static InputDecorationTheme _inputDecorationTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return InputDecorationTheme(
      filled: true,
      fillColor:
          isDark ? AppColors.surfaceAltDark : AppColors.surfaceAltLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark ? AppColors.primaryDark : AppColors.primaryLight,
          width: 2,
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      hintStyle: TextStyle(
        color: isDark
            ? AppColors.textTertiaryDark
            : AppColors.textTertiaryLight,
      ),
    );
  }

  static AppBarTheme _appBarTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return AppBarTheme(
      backgroundColor:
          isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      foregroundColor:
          isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color:
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
    );
  }

  static BottomNavigationBarThemeData _bottomNavTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return BottomNavigationBarThemeData(
      backgroundColor:
          isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      selectedItemColor:
          isDark ? AppColors.primaryDark : AppColors.primaryLight,
      unselectedItemColor:
          isDark ? AppColors.textTertiaryDark : AppColors.textTertiaryLight,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    );
  }

  static ChipThemeData _chipTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return ChipThemeData(
      backgroundColor:
          isDark ? AppColors.surfaceAltDark : AppColors.surfaceAltLight,
      selectedColor: isDark
          ? AppColors.primaryDark.withAlpha(51)
          : AppColors.primaryLight.withAlpha(51),
      disabledColor: isDark
          ? AppColors.surfaceAltDark
          : AppColors.surfaceAltLight,
      labelStyle: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color:
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
      ),
      secondaryLabelStyle: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color:
            isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
    );
  }

  static ElevatedButtonThemeData _elevatedButtonTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor:
            isDark ? AppColors.primaryDark : AppColors.primaryLight,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.sm + 2,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  static IconButtonThemeData _iconButtonTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return IconButtonThemeData(
      style: IconButton.styleFrom(
        foregroundColor:
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
