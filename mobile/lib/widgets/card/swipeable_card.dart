import 'package:flutter/material.dart';
import '../../models/idea.dart';
import 'card_overlay.dart';

/// A Tinder-style swipeable idea card.
///
/// Tracks horizontal drag gesture, applies:
///   - Rotation during drag (max ±15°)
///   - Directional overlay (LIKE/NOPE)
///   - Spring-back animation when under threshold
///   - Exit animation when over threshold
///
/// Threshold: 150px horizontal distance or 500px/s velocity.
class SwipeableCard extends StatefulWidget {
  /// The idea to display on this card.
  final Idea idea;

  /// Called when the card is swiped left (dislike).
  final VoidCallback onSwipedLeft;

  /// Called when the card is swiped right (like).
  final VoidCallback onSwipedRight;

  /// Called during drag with normalized progress (-1.0 to 1.0).
  final ValueChanged<double>? onDragUpdate;

  /// Whether this is the top card (draggable).
  final bool isTop;

  /// Whether localized Arabic idea text should be preferred.
  final bool arabic;

  const SwipeableCard({
    super.key,
    required this.idea,
    required this.onSwipedLeft,
    required this.onSwipedRight,
    this.onDragUpdate,
    this.isTop = true,
    this.arabic = false,
  });

  @override
  State<SwipeableCard> createState() => _SwipeableCardState();
}

class _SwipeableCardState extends State<SwipeableCard>
    with SingleTickerProviderStateMixin {
  /// Current horizontal drag offset.
  double _dragX = 0;

  /// Whether the card is currently being dragged.
  bool _isDragging = false;

  /// Whether the card has exited the screen.
  bool _exited = false;

  /// Exit direction for animation.
  double _exitDirection = 0;

  /// Spring animation controller for the exit.
  late final AnimationController _exitController;
  late final Animation<Offset> _exitAnimation;

  static const double _swipeThreshold = 150;
  static const double _velocityThreshold = 500;
  static const double _maxRotation = 0.26; // ~15 degrees in radians

  @override
  void initState() {
    super.initState();
    _exitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _exitAnimation = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(2.0, 0),
    ).animate(CurvedAnimation(
      parent: _exitController,
      curve: Curves.easeOut,
    ));

    _exitController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        // Signal the parent that the card has fully exited.
        if (_exitDirection > 0) {
          widget.onSwipedRight();
        } else {
          widget.onSwipedLeft();
        }
      }
    });
  }

  @override
  void dispose() {
    _exitController.dispose();
    super.dispose();
  }

  void _onPanStart(DragStartDetails details) {
    if (!widget.isTop || _exited) return;
    setState(() => _isDragging = true);
  }

  void _onPanUpdate(DragUpdateDetails details) {
    if (!widget.isTop || _exited) return;

    setState(() {
      _dragX += details.delta.dx;
    });

    final progress = (_dragX / _swipeThreshold).clamp(-1.0, 1.0);
    widget.onDragUpdate?.call(progress);
  }

  void _onPanEnd(DragEndDetails details) {
    if (!widget.isTop || _exited) return;

    final absDx = _dragX.abs();
    final velocity = details.velocity.pixelsPerSecond.dx.abs();

    if (absDx > _swipeThreshold || velocity > _velocityThreshold) {
      // Swipe threshold exceeded — animate exit.
      _exitDirection = _dragX.sign;
      _exited = true;
      _exitController.forward();
    } else {
      // Under threshold — spring back.
      setState(() {
        _dragX = 0;
        _isDragging = false;
      });
      widget.onDragUpdate?.call(0);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_exited) {
      return AnimatedBuilder(
        animation: _exitAnimation,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(
              _exitAnimation.value.dx * MediaQuery.of(context).size.width,
              _exitAnimation.value.dy * 100,
            ),
            child: Transform.rotate(
              angle: _exitDirection * _maxRotation,
              child: child,
            ),
          );
        },
        child: _buildCardContent(context),
      );
    }

    final rotationAngle =
        (_dragX / _swipeThreshold).clamp(-1.0, 1.0) * _maxRotation;

    return GestureDetector(
      onPanStart: _onPanStart,
      onPanUpdate: _onPanUpdate,
      onPanEnd: _onPanEnd,
      child: AnimatedContainer(
        duration:
            _isDragging ? Duration.zero : const Duration(milliseconds: 300),
        curve: Curves.easeOut,
        transform: Matrix4.identity()
          ..translateByDouble(_dragX, 0, 0, 1)
          ..rotateZ(rotationAngle),
        transformAlignment: Alignment.center,
        child: Stack(
          children: [
            _buildCardContent(context),
            // Show overlay during drag
            if (_isDragging)
              CardOverlay(
                  dragProgress: (_dragX / _swipeThreshold).clamp(-1.0, 1.0)),
          ],
        ),
      ),
    );
  }

  Widget _buildCardContent(BuildContext context) {
    final idea = widget.idea;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      height: 480,
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 77 : 26),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Idea image (falls back to a category gradient).
          Container(
            height: 264, // ~55% of 480
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF21262D) : const Color(0xFFF3F4F6),
              gradient: LinearGradient(
                colors: [
                  _getCategoryColor(idea.category),
                  _getCategoryColor(idea.category).withAlpha(128),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: idea.imageUrl != null
                ? Image.network(
                    idea.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Center(
                      child: Icon(
                        _getCategoryIcon(idea.category),
                        size: 64,
                        color: Colors.white.withAlpha(153),
                      ),
                    ),
                  )
                : Center(
                    child: Icon(
                      _getCategoryIcon(idea.category),
                      size: 64,
                      color: Colors.white.withAlpha(153),
                    ),
                  ),
          ),

          // Content padding
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title — 2 lines max
                  Text(
                    idea.displayTitle(arabic: widget.arabic),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontFamily: 'Roboto',
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 8),

                  // University + Difficulty
                  Row(
                    children: [
                      Icon(
                        Icons.school_outlined,
                        size: 14,
                        color: theme.textTheme.bodyMedium?.color,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          idea.university ?? 'Unknown',
                          style: theme.textTheme.bodyMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        idea.difficultyDisplay,
                        style: theme.textTheme.labelSmall,
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Description — 3 lines max
                  Text(
                    idea.displayDescription(arabic: widget.arabic),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: isDark
                          ? const Color(0xFF8B949E)
                          : const Color(0xFF6B7280),
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const Spacer(),

                  // Tech stack badges
                  if (idea.technologies.isNotEmpty)
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: idea.technologies.take(5).map((tech) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF21262D)
                                : const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            tech,
                            style: theme.textTheme.labelSmall,
                          ),
                        );
                      }).toList(),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getCategoryColor(String? category) {
    switch (category?.toLowerCase()) {
      case 'web development':
        return const Color(0xFF3B82F6);
      case 'mobile development':
        return const Color(0xFF8B5CF6);
      case 'machine learning':
      case 'data science':
        return const Color(0xFF10B981);
      case 'cybersecurity':
        return const Color(0xFFEF4444);
      case 'devops':
      case 'cloud computing':
        return const Color(0xFFF59E0B);
      case 'game development':
        return const Color(0xFFEC4899);
      case 'ar/vr':
        return const Color(0xFF6366F1);
      default:
        return const Color(0xFF6B7280);
    }
  }

  IconData _getCategoryIcon(String? category) {
    switch (category?.toLowerCase()) {
      case 'web development':
        return Icons.language;
      case 'mobile development':
        return Icons.phone_android;
      case 'machine learning':
      case 'data science':
        return Icons.psychology;
      case 'cybersecurity':
        return Icons.shield;
      case 'devops':
      case 'cloud computing':
        return Icons.cloud;
      case 'game development':
        return Icons.sports_esports;
      case 'ar/vr':
        return Icons.view_in_ar;
      default:
        return Icons.lightbulb_outline;
    }
  }
}
