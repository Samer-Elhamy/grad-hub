import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Reusable error snackbar with optional retry action.
///
/// Shows a styled SnackBar with the error message, an optional retry
/// button on the right, and auto-dismisses after 5 seconds.
///
/// Usage:
/// ```dart
/// ErrorSnackbar.show(context, 'Failed to load ideas', onRetry: () { ... });
/// ```
class ErrorSnackbar {
  ErrorSnackbar._();

  /// The currently active snackbar controller (for debouncing).
  static ScaffoldFeatureController<SnackBar, SnackBarClosedReason>?
      _currentController;

  /// Show an error snackbar.
  ///
  /// [message] — the error text to display.
  /// [onRetry] — if provided, a "Retry" action button is shown.
  /// [duration] — how long before auto-dismiss (default 5s).
  static void show(
    BuildContext context, {
    required String message,
    VoidCallback? onRetry,
    Duration duration = const Duration(seconds: 5),
  }) {
    // Dismiss any existing snackbar first.
    _currentController?.close();
    ScaffoldMessenger.of(context).clearSnackBars();

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final snackBar = SnackBar(
      content: Row(
        children: [
          // Error icon
          Icon(
            Icons.error_outline_rounded,
            color: isDark ? AppColors.errorDark : AppColors.errorLight,
            size: 20,
          ),
          const SizedBox(width: 12),
          // Message
          Expanded(
            child: Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          // Retry button
          if (onRetry != null) ...[
            const SizedBox(width: 8),
            TextButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
              style: TextButton.styleFrom(
                foregroundColor:
                    isDark ? AppColors.primaryDark : AppColors.primaryLight,
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                textStyle: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ],
      ),
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          width: 0.5,
        ),
      ),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      duration: duration,
      dismissDirection: DismissDirection.horizontal,
      action: SnackBarAction(
        label: 'Dismiss',
        textColor:
            isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
        onPressed: () {
          _currentController?.close();
        },
      ),
    );

    _currentController = ScaffoldMessenger.of(context).showSnackBar(snackBar);
  }
}
