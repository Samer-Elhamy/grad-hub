import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';

/// Empty state widget shown when no ideas are available.
///
/// Displays:
///   - Animated search indicator (pulsing rings + magnifying glass)
///   - "Searching for ideas..." message
///   - Estimated wait time counter
///   - Reconnect countdown when WebSocket disconnected
///
/// Usage:
/// ```dart
/// const EmptyState(
///   wsConnected: false,
///   reconnectSeconds: 10,
///   onReconnect: () { ... },
/// );
/// ```
class EmptyState extends StatefulWidget {
  /// Whether the WebSocket is currently connected.
  final bool wsConnected;

  /// Estimated seconds until WebSocket reconnect.
  final int reconnectSeconds;

  /// Callback for manual reconnect.
  final VoidCallback? onReconnect;

  /// Custom message override.
  final String? message;

  /// Custom subtitle override.
  final String? subtitle;

  const EmptyState({
    super.key,
    this.wsConnected = false,
    this.reconnectSeconds = 10,
    this.onReconnect,
    this.message,
    this.subtitle,
  });

  @override
  State<EmptyState> createState() => _EmptyStateState();
}

class _EmptyStateState extends State<EmptyState>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  int _elapsed = 0;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    // Start elapsed timer
    _startElapsedTimer();
  }

  void _startElapsedTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() => _elapsed++);
        _startElapsedTimer();
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  String get _elapsedDisplay {
    if (_elapsed < 60) return '${_elapsed}s';
    return '${_elapsed ~/ 60}m ${_elapsed % 60}s';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Animated search indicator
            _SearchIndicator(isDark: isDark),

            const SizedBox(height: 24),

            // Main message
            Text(
              widget.message ?? 'Searching for ideas...',
              style: theme.textTheme.titleMedium?.copyWith(
                color: isDark
                    ? AppColors.textPrimaryDark
                    : AppColors.textPrimaryLight,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 8),

            // Subtitle
            Text(
              widget.subtitle ??
                  'Our Deep Search Agent is scanning university repositories '
                      'and trending projects to find ideas that match your preferences.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 24),

            // Elapsed timer
            Text(
              'Searching for $_elapsedDisplay...',
              style: theme.textTheme.bodySmall?.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),

            // Loading dots
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(3, (i) {
                return Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color:
                        isDark ? AppColors.primaryDark : AppColors.primaryLight,
                  ),
                )
                    .animate(
                      onPlay: (controller) => controller.repeat(),
                    )
                    .fadeIn(
                      duration: 600.ms,
                      delay: (i * 200).ms,
                    )
                    .then()
                    .fadeOut(
                      duration: 600.ms,
                    );
              }),
            ),

            // Reconnect section if disconnected
            if (!widget.wsConnected) ...[
              const SizedBox(height: 20),
              Text(
                'Reconnecting in ${widget.reconnectSeconds}s...',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isDark ? AppColors.warning : AppColors.warning,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              if (widget.onReconnect != null) ...[
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: widget.onReconnect,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Reconnect Now'),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

/// Animated search indicator with pulsing rings and magnifying glass.
class _SearchIndicator extends StatelessWidget {
  final bool isDark;

  const _SearchIndicator({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final primary = isDark ? AppColors.primaryDark : AppColors.primaryLight;

    return SizedBox(
      width: 80,
      height: 80,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer pulse ring
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: primary.withAlpha(60), width: 2),
            ),
          )
              .animate(onPlay: (controller) => controller.repeat())
              .scale(
                duration: 2000.ms,
                begin: const Offset(1, 1),
                end: const Offset(1.3, 1.3),
                curve: Curves.easeInOut,
              )
              .then()
              .fadeOut(duration: 500.ms)
              .then()
              .fadeIn(duration: 500.ms),

          // Inner pulse ring
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: primary.withAlpha(100), width: 2),
            ),
          )
              .animate(onPlay: (controller) => controller.repeat())
              .scale(
                duration: 2000.ms,
                delay: 500.ms,
                begin: const Offset(1, 1),
                end: const Offset(1.2, 1.2),
                curve: Curves.easeInOut,
              )
              .then()
              .fadeOut(duration: 500.ms)
              .then()
              .fadeIn(duration: 500.ms),

          // Search icon
          Icon(
            Icons.search_rounded,
            size: 36,
            color: primary,
          ),
        ],
      ),
    );
  }
}
