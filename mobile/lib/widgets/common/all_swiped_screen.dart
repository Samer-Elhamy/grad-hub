import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../services/websocket_service.dart';
import '../common/loading_indicator.dart';

/// Provider that exposes WebSocket connection status.
final wsConnectionStatusProvider = Provider<WsConnectionStatus>((ref) {
  final ws = ref.watch(webSocketServiceProvider);
  return WsConnectionStatus(
    isConnected: ws.isConnected,
    statusLabel: ws.isConnected ? 'Connected' : 'Disconnected',
  );
});

/// Connection status data class.
class WsConnectionStatus {
  final bool isConnected;
  final String statusLabel;

  const WsConnectionStatus({
    required this.isConnected,
    required this.statusLabel,
  });
}

/// "All Swiped" screen shown when the user has gone through every available idea.
///
/// Displays:
///   - "More ideas coming soon" message
///   - Animated background search indicator (Deep Search Agent)
///   - WebSocket reconnect countdown timer
///   - Manual reconnect button
///
/// Usage:
/// ```dart
/// AllSwipedScreen(
///   estimatedReconnectSeconds: 10,
/// );
/// ```
class AllSwipedScreen extends ConsumerStatefulWidget {
  /// Estimated seconds until WebSocket auto-reconnect.
  final int estimatedReconnectSeconds;

  const AllSwipedScreen({
    super.key,
    this.estimatedReconnectSeconds = 10,
  });

  @override
  ConsumerState<AllSwipedScreen> createState() => _AllSwipedScreenState();
}

class _AllSwipedScreenState extends ConsumerState<AllSwipedScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  Timer? _countdownTimer;
  int _remainingSeconds = 0;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _remainingSeconds = widget.estimatedReconnectSeconds;
    _startCountdown();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          if (_remainingSeconds > 0) {
            _remainingSeconds--;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _handleReconnect() {
    final ws = ref.read(webSocketServiceProvider);
    ws.connect();
    setState(() {
      _remainingSeconds = widget.estimatedReconnectSeconds;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final wsStatus = ref.watch(wsConnectionStatusProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Animated orbital search indicator
                _SearchOrbit(
                  isDark: isDark,
                  pulseController: _pulseController,
                ),

                const SizedBox(height: 28),

                // Main message
                Text(
                  'More ideas coming soon',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: isDark
                        ? AppColors.textPrimaryDark
                        : AppColors.textPrimaryLight,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 12),

                // Explanation
                Text(
                  'Our Deep Search Agent is crawling top university '
                  'repositories and GitHub trending projects to find '
                  'fresh ideas tailored to your preferences.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: isDark
                        ? AppColors.textSecondaryDark
                        : AppColors.textSecondaryLight,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 28),

                // Connection status
                _ConnectionStatus(
                  isConnected: wsStatus.isConnected,
                  label: wsStatus.statusLabel,
                  isDark: isDark,
                ),

                const SizedBox(height: 12),

                // Countdown
                if (!wsStatus.isConnected && _remainingSeconds > 0)
                  Text(
                    'Auto-reconnect in $_remainingSeconds s',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isDark
                          ? AppColors.textTertiaryDark
                          : AppColors.textTertiaryLight,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),

                const SizedBox(height: 20),

                // Reconnect button
                if (!wsStatus.isConnected)
                  ElevatedButton.icon(
                    onPressed: _handleReconnect,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Reconnect Now'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Animated orbital search indicator with orbiting dots.
class _SearchOrbit extends StatelessWidget {
  final bool isDark;
  final AnimationController pulseController;

  const _SearchOrbit({
    required this.isDark,
    required this.pulseController,
  });

  @override
  Widget build(BuildContext context) {
    final primary = isDark ? AppColors.primaryDark : AppColors.primaryLight;

    return SizedBox(
      width: 72,
      height: 72,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Center dot
          AnimatedBuilder(
            animation: pulseController,
            builder: (context, child) {
              return Container(
                width: 14 + pulseController.value * 4,
                height: 14 + pulseController.value * 4,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: primary.withAlpha(200),
                ),
              );
            },
          ),

          // Orbiting dots
          ...List.generate(4, (index) {
            final angle = index * 90.0;
            return _OrbitingDot(
              angle: angle,
              radius: 28,
              color: primary.withAlpha(150),
              delay: index * 750,
            );
          }),
        ],
      ),
    );
  }
}

/// Single orbiting dot with rotation animation.
class _OrbitingDot extends StatefulWidget {
  final double angle;
  final double radius;
  final Color color;
  final int delay;

  const _OrbitingDot({
    required this.angle,
    required this.radius,
    required this.color,
    required this.delay,
  });

  @override
  State<_OrbitingDot> createState() => _OrbitingDotState();
}

class _OrbitingDotState extends State<_OrbitingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final rotation = _controller.value * 360 + widget.angle;
        final rad = rotation * (3.14159 / 180);
        final x = widget.radius * math.cos(rad);
        final y = widget.radius * math.sin(rad);

        return Positioned(
          left: 36 + x - 3,
          top: 36 + y - 3,
          child: Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.color,
            ),
          ),
        );
      },
    );
  }
}

/// Connection status badge.
class _ConnectionStatus extends StatelessWidget {
  final bool isConnected;
  final String label;
  final bool isDark;

  const _ConnectionStatus({
    required this.isConnected,
    required this.label,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: isConnected
            ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))
            : (isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isConnected
                  ? (isDark ? AppColors.successDark : AppColors.successLight)
                  : Colors.grey,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isConnected
                  ? (isDark ? const Color(0xFFA7F3D0) : const Color(0xFF065F46))
                  : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
            ),
          ),
        ],
      ),
    );
  }
}
