import 'package:flutter/material.dart';
import '../../models/idea.dart';
import '../../theme/app_theme.dart';

/// A debounced undo toast that appears after a swipe.
///
/// Shows the idea title and an "Undo" button for 3 seconds.
/// Only one toast is visible at a time — showing a new one
/// dismisses any existing toast.
///
/// On tap "Undo", the [onUndo] callback is invoked with the
/// [Idea] so the caller can re-add it to the card stack.
///
/// Usage:
/// ```dart
/// UndoToast.show(context, idea: currentIdea, onUndo: (idea) { ... });
/// ```
class UndoToast {
  UndoToast._();

  /// The currently visible undo toast key (for debouncing).
  static OverlayEntry? _currentEntry;

  /// Show an undo toast anchored at the bottom of the screen.
  ///
  /// Dismisses any previously visible toast automatically.
  /// Auto-dismisses after [duration] (default 3 seconds).
  static void show(
    BuildContext context, {
    required Idea idea,
    required void Function(Idea idea) onUndo,
    Duration duration = const Duration(seconds: 3),
  }) {
    // Dismiss any existing toast first.
    dismiss();

    final overlay = Overlay.of(context);
    _currentEntry = OverlayEntry(
      builder: (ctx) => _UndoToastWidget(
        idea: idea,
        onUndo: () {
          dismiss();
          onUndo(idea);
        },
        onDismiss: dismiss,
        duration: duration,
      ),
    );

    overlay.insert(_currentEntry!);

    // Auto-dismiss after the given duration.
    Future.delayed(duration, () {
      // Only dismiss if this is still the current entry.
      if (_currentEntry?.mounted ?? false) {
        dismiss();
      }
    });
  }

  /// Dismiss the currently visible undo toast, if any.
  static void dismiss() {
    _currentEntry?.remove();
    _currentEntry?.dispose();
    _currentEntry = null;
  }
}

/// Internal stateful widget for the undo toast overlay animation.
class _UndoToastWidget extends StatefulWidget {
  final Idea idea;
  final VoidCallback onUndo;
  final VoidCallback onDismiss;
  final Duration duration;

  const _UndoToastWidget({
    required this.idea,
    required this.onUndo,
    required this.onDismiss,
    required this.duration,
  });

  @override
  State<_UndoToastWidget> createState() => _UndoToastWidgetState();
}

class _UndoToastWidgetState extends State<_UndoToastWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 1.5), // Start below screen
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    ));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Positioned(
      left: 16,
      right: 16,
      bottom: MediaQuery.of(context).padding.bottom + 24,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.surfaceDark
                    : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  width: 0.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(38),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Undo icon
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withAlpha(26),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.undo_rounded,
                      color: Color(0xFFF59E0B),
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Idea title
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Swiped',
                          style: theme.textTheme.labelSmall,
                        ),
                        Text(
                          widget.idea.titleAr ?? widget.idea.title,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Undo button
                  GestureDetector(
                    onTap: widget.onUndo,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.primaryDark.withAlpha(26)
                            : AppColors.primaryLight.withAlpha(26),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Undo',
                        style: TextStyle(
                          color: isDark
                              ? AppColors.primaryDark
                              : AppColors.primaryLight,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
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
