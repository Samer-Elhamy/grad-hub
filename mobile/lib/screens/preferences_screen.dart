import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../i18n.dart';
import '../models/preference.dart';
import '../providers/language_provider.dart';
import '../providers/preference_provider.dart';

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

          // Liked categories
          _buildSectionLabel(context, tr(language, 'likedCategories')),
          const SizedBox(height: 8),
          if (prefs.likedCategories.isEmpty)
            _buildEmptyHint(context, tr(language, 'noLikedCategories'))
          else
            _buildCategoryChips(
              context,
              categories: prefs.allLikedCategoryNames,
              selectedCategories: prefs.allLikedCategoryNames,
              excludedCategories: prefs.excludedCategories,
              onToggle: (cat) => ref
                  .read(preferenceProvider.notifier)
                  .toggleLikedCategory(cat),
              isDark: isDark,
            ),
          const SizedBox(height: 24),

          // Excluded categories
          _buildSectionLabel(context, tr(language, 'excludedCategories')),
          const SizedBox(height: 8),
          if (prefs.excludedCategories.isEmpty)
            _buildEmptyHint(context, tr(language, 'noExcludedCategories'))
          else
            _buildCategoryChips(
              context,
              categories: prefs.excludedCategories,
              selectedCategories: prefs.allLikedCategoryNames,
              excludedCategories: prefs.excludedCategories,
              onToggle: (cat) => ref
                  .read(preferenceProvider.notifier)
                  .toggleExcludedCategory(cat),
              isDark: isDark,
              showExcluded: true,
            ),
          const SizedBox(height: 24),

          // All available categories
          _buildSectionLabel(context, tr(language, 'allCategories')),
          const SizedBox(height: 8),
          _buildCategoryChips(
            context,
            categories: PreferenceNotifier.availableCategories,
            selectedCategories: prefs.allLikedCategoryNames,
            excludedCategories: prefs.excludedCategories,
            onToggle: (cat) =>
                ref.read(preferenceProvider.notifier).toggleLikedCategory(cat),
            isDark: isDark,
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

  Widget _buildCategoryChips(
    BuildContext context, {
    required List<String> categories,
    required List<String> selectedCategories,
    required List<String> excludedCategories,
    required ValueChanged<String> onToggle,
    required bool isDark,
    bool showExcluded = false,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: categories.map((category) {
        final isSelected = selectedCategories.contains(category);
        final isExcluded = excludedCategories.contains(category);

        Color chipColor;
        if (isExcluded) {
          chipColor = const Color(0xFFEF4444);
        } else if (isSelected) {
          chipColor = const Color(0xFF10B981);
        } else {
          chipColor =
              isDark ? const Color(0xFF30363D) : const Color(0xFFE5E7EB);
        }

        return GestureDetector(
          onTap: () => onToggle(category),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 8,
            ),
            decoration: BoxDecoration(
              color: isExcluded
                  ? chipColor.withAlpha(26)
                  : isSelected
                      ? chipColor.withAlpha(26)
                      : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: chipColor.withAlpha(isSelected || isExcluded ? 153 : 77),
                width: isSelected || isExcluded ? 1.5 : 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isSelected)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Icon(Icons.check_circle, size: 16, color: chipColor),
                  ),
                if (isExcluded)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Icon(Icons.block, size: 16, color: chipColor),
                  ),
                Text(
                  category,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isExcluded
                        ? const Color(0xFFEF4444)
                        : isSelected
                            ? const Color(0xFF10B981)
                            : Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
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
