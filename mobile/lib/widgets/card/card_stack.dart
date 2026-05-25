import 'package:flutter/material.dart';
import '../../models/idea.dart';
import 'swipeable_card.dart';

/// Stack of swipeable idea cards.
///
/// Displays 2-3 cards with the scale/y-offset layering:
///   - Top:    scale 1.0,  y: 0px,  full interaction
///   - Middle: scale 0.98, y: 4px,  visible underneath
///   - Bottom: scale 0.96, y: 8px,  visible underneath
///
/// Only the top card is draggable. When swiped away, the next card
/// animates into the top position.
class CardStack extends StatelessWidget {
  /// Ordered list of ideas to display in the stack.
  final List<Idea> ideas;

  /// Called when the top card is swiped left.
  final VoidCallback? onSwipedLeft;

  /// Called when the top card is swiped right.
  final VoidCallback? onSwipedRight;

  /// Called during drag with normalized progress (-1.0 to 1.0).
  final ValueChanged<double>? onDragUpdate;

  /// Whether the stack is in a loading state.
  final bool isLoading;

  const CardStack({
    super.key,
    required this.ideas,
    this.onSwipedLeft,
    this.onSwipedRight,
    this.onDragUpdate,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return _buildSkeletonStack(context);
    }

    if (ideas.isEmpty) {
      return _buildEmptyState(context);
    }

    // Take up to 3 cards for the stack
    final displayIdeas = ideas.take(3).toList();

    return SizedBox(
      height: 480,
      child: Stack(
        children: [
          for (var i = displayIdeas.length - 1; i >= 0; i--)
            _buildStackedCard(
              context,
              idea: displayIdeas[i],
              index: i,
              total: displayIdeas.length,
            ),
        ],
      ),
    );
  }

  Widget _buildStackedCard(
    BuildContext context, {
    required Idea idea,
    required int index,
    required int total,
  }) {
    final isTop = index == 0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Stack offset: each card below is offset by more
    // Top: 0, middle: 1, bottom: 2
    final stackIndex = total - 1 - index; // bottom=0, middle=1, top=2
    final yOffset = (stackIndex * 4.0);
    final scale = 1.0 - (stackIndex * 0.02);

    return Positioned.fill(
      top: yOffset,
      child: Transform.scale(
        scale: scale,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: !isTop
                ? [
                    BoxShadow(
                      color: Colors.black.withAlpha(13),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: isTop
              ? SwipeableCard(
                  key: ValueKey('swipe-card-${idea.id}'),
                  idea: idea,
                  isTop: true,
                  onSwipedLeft: onSwipedLeft ?? () {},
                  onSwipedRight: onSwipedRight ?? () {},
                  onDragUpdate: onDragUpdate,
                )
              : ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: _buildMiniCard(context, idea, isDark),
                ),
        ),
      ),
    );
  }

  /// Smaller/tighter card for non-top positions.
  Widget _buildMiniCard(BuildContext context, Idea idea, bool isDark) {
    return Container(
      width: double.infinity,
      height: 480,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF30363D) : const Color(0xFFE5E7EB),
          width: 0.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Mini image placeholder
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF21262D) : const Color(0xFFF3F4F6),
            ),
            child: Center(
              child: Icon(
                Icons.lightbulb_outline,
                size: 40,
                color:
                    isDark ? const Color(0xFF484F58) : const Color(0xFFD1D5DB),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  idea.titleAr ?? idea.title,
                  style: Theme.of(context).textTheme.titleSmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  idea.university ?? '',
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonStack(BuildContext context) {
    return SizedBox(
      height: 480,
      child: Stack(
        children: [
          // Bottom skeleton
          Positioned.fill(
            top: 8,
            child: Transform.scale(
              scale: 0.96,
              child: _buildSkeletonCard(context),
            ),
          ),
          // Middle skeleton
          Positioned.fill(
            top: 4,
            child: Transform.scale(
              scale: 0.98,
              child: _buildSkeletonCard(context),
            ),
          ),
          // Top skeleton (animated)
          Positioned.fill(
            child: _buildSkeletonCard(context, isTop: true),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonCard(BuildContext context, {bool isTop = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final shimmerColor =
        isDark ? const Color(0xFF21262D) : const Color(0xFFF3F4F6);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 800),
      decoration: BoxDecoration(
        color: shimmerColor.withAlpha(isTop ? 255 : 180),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF30363D) : const Color(0xFFE5E7EB),
          width: 0.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image skeleton
          Container(
            height: 264,
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF30363D) : const Color(0xFFE5E7EB),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
            ),
          ),
          // Text lines skeleton
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 200,
                  height: 20,
                  decoration: BoxDecoration(
                    color: shimmerColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: 140,
                  height: 14,
                  decoration: BoxDecoration(
                    color: shimmerColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  height: 14,
                  decoration: BoxDecoration(
                    color: shimmerColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 180,
                  height: 14,
                  decoration: BoxDecoration(
                    color: shimmerColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 480,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: theme.textTheme.bodyMedium?.color?.withAlpha(128),
            ),
            const SizedBox(height: 16),
            Text(
              'No more ideas',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for new suggestions.',
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}
