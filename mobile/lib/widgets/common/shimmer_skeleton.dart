import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Shimmer animation that creates a moving gradient effect.
///
/// Used as a base block for building skeleton loaders.
/// Inspired by Facebook's shimmer pattern.
class ShimmerBlock extends StatefulWidget {
  /// Width of the shimmer block. Null means expand to parent.
  final double? width;

  /// Height of the shimmer block.
  final double height;

  /// Border radius for the block.
  final double borderRadius;

  /// Additional margin around the block.
  final EdgeInsetsGeometry? margin;

  const ShimmerBlock({
    super.key,
    this.width,
    required this.height,
    this.borderRadius = 8,
    this.margin,
  });

  @override
  State<ShimmerBlock> createState() => _ShimmerBlockState();
}

class _ShimmerBlockState extends State<ShimmerBlock>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _animation = Tween<double>(begin: -1, end: 2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: widget.width,
      height: widget.height,
      margin: widget.margin,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        color: isDark ? AppColors.surfaceAltDark : AppColors.surfaceAltLight,
      ),
      clipBehavior: Clip.antiAlias,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          return CustomPaint(
            painter: _ShimmerPainter(
              progress: _animation.value,
              baseColor: isDark
                  ? AppColors.surfaceDark
                  : AppColors.surfaceLight,
              highlightColor: isDark
                  ? AppColors.surfaceAltDark
                  : AppColors.surfaceAltLight,
            ),
          );
        },
      ),
    );
  }
}

/// Custom painter for the shimmer gradient effect.
class _ShimmerPainter extends CustomPainter {
  final double progress;
  final Color baseColor;
  final Color highlightColor;

  _ShimmerPainter({
    required this.progress,
    required this.baseColor,
    required this.highlightColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;

    // Base fill
    canvas.drawRect(rect, Paint()..color = baseColor);

    // Moving highlight gradient
    final gradientWidth = size.width * 0.5;
    final centerX = progress * size.width;
    final startX = centerX - gradientWidth / 2;
    final endX = centerX + gradientWidth / 2;

    final gradient = LinearGradient(
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
      colors: [
        baseColor.withAlpha(0),
        highlightColor.withAlpha(150),
        baseColor.withAlpha(0),
      ],
      stops: const [0.0, 0.5, 1.0],
    );

    canvas.clipRect(rect);
    canvas.drawRect(
      Rect.fromLTRB(startX, 0, endX, size.height),
      Paint()..shader = gradient.createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_ShimmerPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

/// Card skeleton shimmer that matches the swipeable card dimensions.
///
/// Shows placeholder blocks for:
///   - Image area (aspect 4:3)
///   - Title line
///   - Description lines
///   - Tag chips
///   - Metadata row
class CardShimmer extends StatelessWidget {
  const CardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = math.min(screenWidth - 32, 400.0);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Image area (aspect 4:3)
          ShimmerBlock(
            width: cardWidth,
            height: cardWidth * 0.75,
            borderRadius: 16,
          ),
          const SizedBox(height: 16),

          // Title line
          ShimmerBlock(
            width: cardWidth * 0.7,
            height: 20,
            borderRadius: 4,
            margin: const EdgeInsets.only(bottom: 12),
          ),
          // Description lines
          ShimmerBlock(
            width: cardWidth,
            height: 14,
            borderRadius: 4,
            margin: const EdgeInsets.only(bottom: 8),
          ),
          ShimmerBlock(
            width: cardWidth * 0.85,
            height: 14,
            borderRadius: 4,
            margin: const EdgeInsets.only(bottom: 8),
          ),
          ShimmerBlock(
            width: cardWidth * 0.6,
            height: 14,
            borderRadius: 4,
            margin: const EdgeInsets.only(bottom: 16),
          ),

          // Tag chips row
          Row(
            children: [
              ShimmerBlock(width: 60, height: 24, borderRadius: 12),
              const SizedBox(width: 8),
              ShimmerBlock(width: 80, height: 24, borderRadius: 12),
              const SizedBox(width: 8),
              ShimmerBlock(width: 55, height: 24, borderRadius: 12),
            ],
          ),
          const SizedBox(height: 16),

          // Metadata row
          Row(
            children: [
              ShimmerBlock(width: 90, height: 14, borderRadius: 4),
              const SizedBox(width: 16),
              ShimmerBlock(width: 60, height: 14, borderRadius: 4),
            ],
          ),
        ],
      ),
    );
  }
}

/// Stack of card shimmers for initial loading state.
///
/// Shows within 300ms of fetch start (handled by parent).
class StackShimmer extends StatelessWidget {
  const StackShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(top: 24),
      child: CardShimmer(),
    );
  }
}
