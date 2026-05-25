import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/preference.dart';
import '../services/api_service.dart';
import 'idea_provider.dart';

/// Manages the preference vector state with CRUD via API.
class PreferenceNotifier extends StateNotifier<AsyncValue<PreferenceVector>> {
  final ApiService _api;

  PreferenceNotifier(this._api) : super(const AsyncLoading()) {
    _load();
  }

  /// Fetch current preferences from the API.
  Future<void> _load() async {
    try {
      final prefs = await _api.fetchPreferences();
      state = AsyncData(prefs);
    } catch (e, st) {
      // On first load, default to empty preferences.
      if (state is AsyncLoading) {
        state = AsyncData(const PreferenceVector());
      } else {
        state = AsyncError(e, st);
      }
    }
  }

  /// Reload preferences from the API.
  Future<void> refresh() => _load();

  /// Toggle a category in the excluded list.
  Future<void> toggleExcludedCategory(String category) async {
    final current = state.whenOrNull(data: (d) => d);
    if (current == null) return;

    final updatedExcluded = current.isCategoryExcluded(category)
        ? current.excludedCategories.where((c) => c != category).toList()
        : [...current.excludedCategories, category];

    final updated = PreferenceVector(
      likedCategories: current.likedCategories,
      excludedCategories: updatedExcluded,
      keywords: current.keywords,
      totalSwipes: current.totalSwipes,
      averageRating: current.averageRating,
    );

    state = AsyncData(updated);
    await _save(updated);
  }

  /// Toggle a category as liked/disliked.
  Future<void> toggleLikedCategory(String category) async {
    final current = state.whenOrNull(data: (d) => d);
    if (current == null) return;

    final updatedLiked = current.isCategoryLiked(category)
        ? current.likedCategories.where((c) => c.category != category).toList()
        : [
            ...current.likedCategories,
            CategoryPreference(category: category, weight: 1.0),
          ];

    final updated = PreferenceVector(
      likedCategories: updatedLiked,
      excludedCategories: current.excludedCategories,
      keywords: current.keywords,
      totalSwipes: current.totalSwipes,
      averageRating: current.averageRating,
    );

    state = AsyncData(updated);
    await _save(updated);
  }

  /// Save the full preference vector to the API.
  Future<void> _save(PreferenceVector preferences) async {
    try {
      final result = await _api.updatePreferences(preferences);
      state = AsyncData(result);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  /// All available categories (sourced from the current preferences + common ones).
  static const List<String> availableCategories = [
    'Web Development',
    'Mobile Development',
    'Machine Learning',
    'Data Science',
    'DevOps',
    'Cybersecurity',
    'Cloud Computing',
    'Blockchain',
    'Game Development',
    'AR/VR',
    'IoT',
    'Computer Vision',
    'NLP',
    'Database Systems',
    'Compiler Design',
    'Operating Systems',
    'Computer Graphics',
    'Distributed Systems',
    'Software Engineering',
    'UI/UX Design',
  ];
}

/// Provider for the preference notifier.
final preferenceProvider =
    StateNotifierProvider<PreferenceNotifier, AsyncValue<PreferenceVector>>(
        (ref) {
  final api = ref.watch(apiServiceProvider);
  return PreferenceNotifier(api);
});
