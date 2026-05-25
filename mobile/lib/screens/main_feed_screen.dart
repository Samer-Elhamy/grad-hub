import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/idea.dart';
import '../models/swipe.dart';
import '../i18n.dart';
import '../providers/idea_provider.dart';
import '../providers/language_provider.dart';
import '../providers/swipe_provider.dart';
import '../widgets/card/card_stack.dart';

/// Main feed screen with the Tinder-style card stack.
///
/// Layout:
///   - AppBar with title and idea counter
///   - Card stack (fills available space)
///   - Action buttons (undo, dislike, superlike, like)
class MainFeedScreen extends ConsumerStatefulWidget {
  const MainFeedScreen({super.key});

  @override
  ConsumerState<MainFeedScreen> createState() => _MainFeedScreenState();
}

class _MainFeedScreenState extends ConsumerState<MainFeedScreen> {
  /// Timestamp when the current idea was first shown (for dwell time).
  DateTime? _ideaShownAt;

  @override
  void initState() {
    super.initState();
    _ideaShownAt = DateTime.now();
  }

  @override
  Widget build(BuildContext context) {
    final ideaStackAsync = ref.watch(ideaStackProvider);
    final swipeState = ref.watch(swipeProvider);
    final language = ref.watch(languageProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // App bar area
            _buildAppBar(theme, ideaStackAsync, language),

            // Card stack
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: ideaStackAsync.when(
                  loading: () => const CardStack(
                    ideas: [],
                    isLoading: true,
                    onSwipedLeft: null,
                    onSwipedRight: null,
                  ),
                  error: (error, _) => _buildErrorState(context, error),
                  data: (ideas) => CardStack(
                    ideas: ideas,
                    isLoading: false,
                    onSwipedLeft: () => _handleSwipe(SwipeDirection.left),
                    onSwipedRight: () => _handleSwipe(SwipeDirection.right),
                    onDragUpdate: (_) {},
                    arabic: language.isArabic,
                  ),
                ),
              ),
            ),

            // Action buttons
            _buildActionButtons(theme, swipeState.isSubmitting),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(
    ThemeData theme,
    AsyncValue<List<Idea>> ideaStack,
    AppLanguage language,
  ) {
    final count = ideaStack.whenOrNull(data: (ideas) => ideas.length) ?? 0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tr(language, 'discover'),
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: 2),
              Text(
                '$count ${tr(language, 'ideasInStack')}',
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
          Row(
            children: [
              TextButton(
                onPressed: () => ref.read(languageProvider.notifier).toggle(),
                child: Text(language.isArabic ? 'English' : 'العربية'),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withAlpha(26),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(ThemeData theme, bool isSubmitting) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Undo (placeholder — no server-side undo yet)
          _ActionButton(
            icon: Icons.refresh,
            color: const Color(0xFFF59E0B),
            onTap: () {},
            size: 48,
          ),

          // Dislike (Nope)
          _ActionButton(
            icon: Icons.close_rounded,
            color: const Color(0xFFEF4444),
            onTap:
                isSubmitting ? null : () => _handleSwipe(SwipeDirection.left),
            size: 56,
          ),

          // Super like
          _ActionButton(
            icon: Icons.star_rounded,
            color: const Color(0xFF3B82F6),
            onTap: isSubmitting ? null : () => _handleSwipe(SwipeDirection.up),
            size: 48,
          ),

          // Like
          _ActionButton(
            icon: Icons.favorite_rounded,
            color: const Color(0xFF10B981),
            onTap:
                isSubmitting ? null : () => _handleSwipe(SwipeDirection.right),
            size: 56,
          ),
        ],
      ),
    );
  }

  Future<void> _handleSwipe(SwipeDirection direction) async {
    final idea = ref.read(ideaStackProvider.notifier).currentIdea;
    if (idea == null) return;

    final dwellMs = _ideaShownAt != null
        ? DateTime.now().difference(_ideaShownAt!).inMilliseconds
        : 0;

    await ref.read(swipeProvider.notifier).recordSwipe(
          idea: idea,
          direction: direction,
          dwellTimeMs: dwellMs,
        );

    _ideaShownAt = DateTime.now();
  }

  Widget _buildErrorState(BuildContext context, Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off_rounded, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(tr(ref.watch(languageProvider), 'couldNotLoadIdeas'),
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () {
              ref.invalidate(ideaStackProvider);
            },
            child: Text(tr(ref.watch(languageProvider), 'retry')),
          ),
        ],
      ),
    );
  }
}

/// Circular action button for the feed toolbar.
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  final double size;

  const _ActionButton({
    required this.icon,
    required this.color,
    this.onTap,
    this.size = 48,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: onTap != null
              ? (isDark ? color.withAlpha(26) : color.withAlpha(20))
              : Colors.grey.withAlpha(13),
          border: Border.all(
            color:
                onTap != null ? color.withAlpha(77) : Colors.grey.withAlpha(38),
            width: 2,
          ),
          boxShadow: onTap != null && size >= 56
              ? [
                  BoxShadow(
                    color: color.withAlpha(51),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Icon(
          icon,
          color: onTap != null ? color : Colors.grey,
          size: size * 0.45,
        ),
      ),
    ).animate(target: onTap != null ? 1 : 0).scale(
          duration: 150.ms,
          curve: Curves.easeOut,
        );
  }
}
