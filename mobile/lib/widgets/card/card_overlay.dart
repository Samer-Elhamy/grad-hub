import 'package:flutter/material.dart';

/// Directional glow that appears during a swipe drag.
///
/// Shows a green glow on the right when dragging right, and a red glow on the
/// left when dragging left. Fades in based on drag distance.
class CardOverlay extends StatelessWidget {
  /// Normalized drag progress from -1.0 (full left) to 1.0 (full right).
  final double dragProgress;

  const CardOverlay({super.key, required this.dragProgress});

  @override
  Widget build(BuildContext context) {
    if (dragProgress.abs() < 0.1) return const SizedBox.shrink();

    final isLike = dragProgress > 0;
    final color =
        isLike ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final alignment = isLike ? Alignment.centerRight : Alignment.centerLeft;
    final gradient = LinearGradient(
      begin: isLike ? Alignment.centerRight : Alignment.centerLeft,
      end: isLike ? Alignment.centerLeft : Alignment.centerRight,
      colors: [
        color.withAlpha(115),
        color.withAlpha(48),
        Colors.transparent,
      ],
    );

    return Positioned.fill(
      child: IgnorePointer(
        child: Opacity(
          opacity: dragProgress.abs().clamp(0.0, 1.0),
          child: Align(
            alignment: alignment,
            child: Container(
              key: Key(isLike ? 'like-glow-overlay' : 'nope-glow-overlay'),
              width: MediaQuery.sizeOf(context).width * 0.7,
              height: double.infinity,
              decoration: BoxDecoration(
                gradient: gradient,
                boxShadow: [
                  BoxShadow(
                    color: color.withAlpha(82),
                    blurRadius: 48,
                    spreadRadius: 8,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
