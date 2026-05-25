import 'package:flutter/material.dart';

/// Directional overlay text that appears during a swipe drag.
///
/// Shows "LIKE" (green) when dragging right, "NOPE" (red) when dragging left.
/// Fades in based on how far the card has been dragged.
class CardOverlay extends StatelessWidget {
  /// Normalized drag progress from -1.0 (full left) to 1.0 (full right).
  final double dragProgress;

  const CardOverlay({super.key, required this.dragProgress});

  @override
  Widget build(BuildContext context) {
    if (dragProgress.abs() < 0.1) return const SizedBox.shrink();

    final isLike = dragProgress > 0;

    return Positioned.fill(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Align(
          alignment: isLike ? Alignment.topLeft : Alignment.topRight,
          child: Opacity(
            opacity: (dragProgress.abs()).clamp(0.0, 1.0),
            child: Transform.rotate(
              angle: isLike ? -0.15 : 0.15,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isLike
                        ? const Color(0xFF10B981)
                        : const Color(0xFFEF4444),
                    width: 4,
                  ),
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.transparent,
                ),
                child: Text(
                  isLike ? 'LIKE' : 'NOPE',
                  style: TextStyle(
                    fontFamily: 'Roboto',
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 4,
                    color: isLike
                        ? const Color(0xFF10B981)
                        : const Color(0xFFEF4444),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
