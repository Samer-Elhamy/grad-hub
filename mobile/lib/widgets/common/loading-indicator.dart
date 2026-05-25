import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// A centered loading spinner with optional label text.
///
/// Usage:
/// ```dart
/// const LoadingIndicator(label: 'Loading ideas...');
/// ```
class LoadingIndicator extends StatelessWidget {
  /// Optional text shown below the spinner.
  final String? label;

  /// The size of the spinner (default 36).
  final double size;

  /// Spinner stroke width (default 3.0).
  final double strokeWidth;

  const LoadingIndicator({
    super.key,
    this.label,
    this.size = 36,
    this.strokeWidth = 3.0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(
            strokeWidth: strokeWidth,
            valueColor: AlwaysStoppedAnimation<Color>(
              isDark ? AppColors.primaryDark : AppColors.primaryLight,
            ),
          ),
          if (label != null) ...[
            const SizedBox(height: 16),
            Text(
              label!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: isDark
                    ? AppColors.textSecondaryDark
                    : AppColors.textSecondaryLight,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}

/// Full-screen loading overlay with semi-transparent backdrop.
///
/// Usage:
/// ```dart
/// Stack(
///   children: [
///     // Your content
///     const LoadingOverlay(label: 'Syncing...'),
///   ],
/// );
/// ```
class LoadingOverlay extends StatelessWidget {
  /// Optional label shown below the spinner.
  final String? label;

  const LoadingOverlay({super.key, this.label});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      color: (isDark ? Colors.black : Colors.white).withAlpha(153),
      child: LoadingIndicator(label: label),
    );
  }
}
