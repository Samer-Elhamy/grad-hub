import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../i18n.dart';
import '../models/preference.dart';
import '../providers/language_provider.dart';
import '../providers/preference_provider.dart';

const double _likedCategoryThreshold = 0.6;

enum _CategoryGroup { available, liked, disliked }

/// Preferences screen with category toggles and stats.
///
/// Layout:
///   - Stats summary (total swipes, average rating)
///   - Liked categories (toggleable tags)
///   - Excluded categories (toggleable tags)
///   - All available categories as toggle chips
class PreferencesScreen extends ConsumerWidget {
  const PreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefsAsync = ref.watch(preferenceProvider);
    final language = ref.watch(languageProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: prefsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _buildError(context, e, ref),
          data: (prefs) => _buildContent(context, theme, prefs, ref, language),
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    ThemeData theme,
    PreferenceVector prefs,
    WidgetRef ref,
    AppLanguage language,
  ) {
    final isDark = theme.brightness == Brightness.dark;
    final allCategories = {
      ...PreferenceNotifier.availableCategories,
      ...prefs.likedCategories.map((item) => item.category),
      ...prefs.excludedCategories,
    }.toList();
    double categoryWeight(String category) {
      for (final item in prefs.likedCategories) {
        if (item.category == category) return item.weight;
      }
      return 0;
    }

    final likedCategories = allCategories.where((category) {
      return !prefs.excludedCategories.contains(category) &&
          categoryWeight(category) >= _likedCategoryThreshold;
    }).toList();
    final dislikedCategories = allCategories
        .where((category) => prefs.excludedCategories.contains(category))
        .toList();
    final availableCategories = allCategories
        .where((category) =>
            !likedCategories.contains(category) &&
            !dislikedCategories.contains(category))
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text(tr(language, 'preferences'),
              style: theme.textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            tr(language, 'customiseFeed'),
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),

          // Stats summary
          _buildStatsCard(context, prefs, isDark, language),
          const SizedBox(height: 24),

          _buildCategoryBoard(
            context,
            ref,
            language: language,
            isDark: isDark,
            availableCategories: availableCategories,
            likedCategories: likedCategories,
            dislikedCategories: dislikedCategories,
          ),
          const SizedBox(height: 32),

          // Reset button
          Center(
            child: TextButton.icon(
              onPressed: () => _showResetDialog(context, ref, language),
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(tr(language, 'resetToDefaults')),
              style: TextButton.styleFrom(
                foregroundColor: theme.colorScheme.error,
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildStatsCard(BuildContext context, PreferenceVector prefs,
      bool isDark, AppLanguage language) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _StatItem(
              value: prefs.totalSwipes.toString(),
              label: tr(language, 'swipes'),
              icon: Icons.swipe,
              color: theme.colorScheme.primary,
            ),
            _StatItem(
              value: prefs.likedCategories.length.toString(),
              label: tr(language, 'likedCats'),
              icon: Icons.favorite,
              color: const Color(0xFF10B981),
            ),
            _StatItem(
              value: prefs.averageRating.toStringAsFixed(1),
              label: tr(language, 'avgRating'),
              icon: Icons.star,
              color: const Color(0xFFF59E0B),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionLabel(BuildContext context, String label) {
    return Text(
      label,
      style: Theme.of(context).textTheme.titleMedium,
    );
  }

  Widget _buildEmptyHint(BuildContext context, String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color:
                  Theme.of(context).textTheme.bodyMedium?.color?.withAlpha(128),
            ),
      ),
    );
  }

  Widget _buildCategoryBoard(
    BuildContext context,
    WidgetRef ref, {
    required AppLanguage language,
    required bool isDark,
    required List<String> availableCategories,
    required List<String> likedCategories,
    required List<String> dislikedCategories,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionLabel(context, tr(language, 'categories')),
        const SizedBox(height: 8),
        Text(
          language.isArabic
              ? 'اسحب التصنيف أو استخدم الأزرار لوضعه في الإعجاب أو عدم الإعجاب.'
              : 'Drag a category or use the buttons to move it into like or dislike.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        _buildCategoryDropZone(
          context,
          ref,
          title: language.isArabic ? 'التصنيفات المتاحة' : 'Available Categories',
          emptyText:
              language.isArabic ? 'لا توجد تصنيفات متاحة' : 'No neutral categories',
          group: _CategoryGroup.available,
          categories: availableCategories,
          isDark: isDark,
        ),
        const SizedBox(height: 12),
        _buildCategoryDropZone(
          context,
          ref,
          title: language.isArabic ? 'تصنيفات الإعجاب' : 'Liked Categories',
          emptyText: language.isArabic
              ? 'اسحب تصنيفًا هنا للإعجاب'
              : 'Drag categories here to like them',
          group: _CategoryGroup.liked,
          categories: likedCategories,
          isDark: isDark,
        ),
        const SizedBox(height: 12),
        _buildCategoryDropZone(
          context,
          ref,
          title: language.isArabic
              ? 'تصنيفات عدم الإعجاب'
              : 'Disliked Categories',
          emptyText: language.isArabic
              ? 'اسحب تصنيفًا هنا لإخفائه'
              : 'Drag categories here to dislike them',
          group: _CategoryGroup.disliked,
          categories: dislikedCategories,
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildCategoryDropZone(
    BuildContext context,
    WidgetRef ref, {
    required String title,
    required String emptyText,
    required _CategoryGroup group,
    required List<String> categories,
    required bool isDark,
  }) {
    final color = switch (group) {
      _CategoryGroup.liked => const Color(0xFF10B981),
      _CategoryGroup.disliked => const Color(0xFFEF4444),
      _CategoryGroup.available =>
        isDark ? const Color(0xFF30363D) : const Color(0xFFE5E7EB),
    };

    return DragTarget<String>(
      onWillAcceptWithDetails: (_) => true,
      onAcceptWithDetails: (details) => _moveCategory(ref, details.data, group),
      builder: (context, candidateData, rejectedData) {
        final isHovering = candidateData.isNotEmpty;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isHovering ? color.withAlpha(34) : color.withAlpha(18),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: color.withAlpha(isHovering ? 178 : 92),
              width: isHovering ? 1.6 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              if (categories.isEmpty)
                _buildEmptyHint(context, emptyText)
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: categories
                      .map(
                        (category) => _buildDraggableCategoryChip(
                          context,
                          ref,
                          category: category,
                          group: group,
                        ),
                      )
                      .toList(),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDraggableCategoryChip(
    BuildContext context,
    WidgetRef ref, {
    required String category,
    required _CategoryGroup group,
  }) {
    final child = _buildMovableCategoryChip(
      context,
      ref,
      category: category,
      group: group,
    );

    return Draggable<String>(
      data: category,
      feedback: Material(
        color: Colors.transparent,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 240),
          child: child,
        ),
      ),
      childWhenDragging: Opacity(opacity: 0.35, child: child),
      child: child,
    );
  }

  Widget _buildMovableCategoryChip(
    BuildContext context,
    WidgetRef ref, {
    required String category,
    required _CategoryGroup group,
  }) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor.withAlpha(120)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            category,
            style: theme.textTheme.labelLarge,
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              if (group != _CategoryGroup.liked)
                _smallActionButton(
                  context,
                  label: 'Move to preferred categories',
                  icon: Icons.favorite,
                  color: const Color(0xFF10B981),
                  onPressed: () =>
                      _moveCategory(ref, category, _CategoryGroup.liked),
                ),
              if (group != _CategoryGroup.disliked)
                _smallActionButton(
                  context,
                  label: 'Move to avoided categories',
                  icon: Icons.close,
                  color: const Color(0xFFEF4444),
                  onPressed: () =>
                      _moveCategory(ref, category, _CategoryGroup.disliked),
                ),
              if (group != _CategoryGroup.available)
                _smallActionButton(
                  context,
                  label: 'Clear',
                  icon: Icons.add,
                  color: theme.colorScheme.primary,
                  onPressed: () =>
                      _moveCategory(ref, category, _CategoryGroup.available),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _smallActionButton(
    BuildContext context, {
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return Tooltip(
      message: label,
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(icon, size: 14),
        style: IconButton.styleFrom(
          minimumSize: const Size(28, 28),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          padding: EdgeInsets.zero,
          foregroundColor: color,
          backgroundColor: color.withAlpha(18),
        ),
      ),
    );
  }

  void _moveCategory(
    WidgetRef ref,
    String category,
    _CategoryGroup group,
  ) {
    final notifier = ref.read(preferenceProvider.notifier);
    switch (group) {
      case _CategoryGroup.liked:
        notifier.markCategoryLiked(category);
        break;
      case _CategoryGroup.disliked:
        notifier.markCategoryDisliked(category);
        break;
      case _CategoryGroup.available:
        notifier.clearCategoryPreference(category);
        break;
    }
  }

  Widget _buildError(BuildContext context, Object error, WidgetRef ref) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline,
              size: 48, color: Theme.of(context).colorScheme.error),
          const SizedBox(height: 16),
          Text('Could not load preferences',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () => ref.invalidate(preferenceProvider),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  void _showResetDialog(
      BuildContext context, WidgetRef ref, AppLanguage language) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr(language, 'resetPreferences')),
        content: Text(tr(language, 'resetMessage')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(tr(language, 'cancel')),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              // Reset by removing all liked categories and clearing excluded.
              final prefs = ref.read(preferenceProvider.notifier);
              for (final cat in PreferenceNotifier.availableCategories) {
                prefs.toggleLikedCategory(cat);
              }
            },
            child: Text(tr(language, 'reset')),
          ),
        ],
      ),
    );
  }
}

/// Stat item for the summary card.
class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color color;

  const _StatItem({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: color,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
