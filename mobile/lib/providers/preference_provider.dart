import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/idea.dart';
import '../models/preference.dart';
import '../models/swipe.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import 'local_storage_provider.dart';

/// Manages the preference vector state with CRUD via API.
class PreferenceNotifier extends StateNotifier<AsyncValue<PreferenceVector>> {
  final ApiService? _api;
  final LocalStorageService? _storage;
  static const double manualLikedWeight = 0.85;

  PreferenceNotifier(ApiService api)
      : _api = api,
        _storage = null,
        super(const AsyncLoading()) {
    _load();
  }

  PreferenceNotifier.local(LocalStorageService storage)
      : _api = null,
        _storage = storage,
        super(const AsyncLoading()) {
    _load();
  }

  /// Fetch current preferences from the API.
  Future<void> _load() async {
    try {
      final storage = _storage;
      final prefs = storage != null
          ? await storage.loadPreferences()
          : await _api!.fetchPreferences();
      state = AsyncData(prefs);
    } catch (e, st) {
      // On first load, default to empty preferences.
      if (state is AsyncLoading) {
        state = const AsyncData(PreferenceVector());
      } else {
        state = AsyncError(e, st);
      }
    }
  }

  /// Reload preferences from the API.
  Future<void> refresh() => _load();

  /// Update preferences from a local swipe without a backend round-trip.
  Future<void> applySwipeFeedback(Idea idea, SwipeDirection direction) async {
    final current = state.whenOrNull(data: (d) => d) ?? const PreferenceVector();
    final category = idea.category;
    if (category == null || category.isEmpty) return;

    final currentWeight = current.likedCategories
        .where((item) => item.category == category)
        .map((item) => item.weight)
        .fold<double>(0.5, (_, weight) => weight);
    final adjustment = switch (direction) {
      SwipeDirection.left => -0.1,
      SwipeDirection.right => 0.1,
      SwipeDirection.up => 0.15,
    };
    final nextWeight = (currentWeight + adjustment).clamp(0.0, 1.0).toDouble();
    final excluded = nextWeight < 0.05
        ? {
            ...current.excludedCategories,
            category,
          }.toList()
        : current.excludedCategories.where((item) => item != category).toList();
    final updated = PreferenceVector(
      likedCategories:
          _setCategoryWeight(current.likedCategories, category, nextWeight),
      excludedCategories: excluded,
      keywords: current.keywords,
      totalSwipes: current.totalSwipes + 1,
      averageRating: current.averageRating,
    );

    state = AsyncData(updated);
    await _save(updated);
  }

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

  /// Move a category into the liked group.
  Future<void> markCategoryLiked(String category) async {
    final current = state.whenOrNull(data: (d) => d);
    if (current == null) return;

    final updated = PreferenceVector(
      likedCategories:
          _setCategoryWeight(current.likedCategories, category, manualLikedWeight),
      excludedCategories:
          current.excludedCategories.where((c) => c != category).toList(),
      keywords: current.keywords,
      totalSwipes: current.totalSwipes,
      averageRating: current.averageRating,
    );

    state = AsyncData(updated);
    await _save(updated);
  }

  /// Move a category into the disliked group.
  Future<void> markCategoryDisliked(String category) async {
    final current = state.whenOrNull(data: (d) => d);
    if (current == null) return;

    final excluded = current.excludedCategories.contains(category)
        ? current.excludedCategories
        : [...current.excludedCategories, category];
    final updated = PreferenceVector(
      likedCategories: _setCategoryWeight(current.likedCategories, category, 0),
      excludedCategories: excluded,
      keywords: current.keywords,
      totalSwipes: current.totalSwipes,
      averageRating: current.averageRating,
    );

    state = AsyncData(updated);
    await _save(updated);
  }

  /// Move a category back to the neutral available group.
  Future<void> clearCategoryPreference(String category) async {
    final current = state.whenOrNull(data: (d) => d);
    if (current == null) return;

    final updated = PreferenceVector(
      likedCategories: _setCategoryWeight(current.likedCategories, category, 0),
      excludedCategories:
          current.excludedCategories.where((c) => c != category).toList(),
      keywords: current.keywords,
      totalSwipes: current.totalSwipes,
      averageRating: current.averageRating,
    );

    state = AsyncData(updated);
    await _save(updated);
  }

  /// Save the full preference vector.
  Future<void> _save(PreferenceVector preferences) async {
    try {
      final storage = _storage;
      final result = storage != null
          ? preferences
          : await _api!.updatePreferences(preferences);
      if (storage != null) {
        await storage.savePreferences(preferences);
      }
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

  static List<CategoryPreference> _setCategoryWeight(
    List<CategoryPreference> categories,
    String category,
    double weight,
  ) {
    return [
      ...categories.where((item) => item.category != category),
      CategoryPreference(category: category, weight: weight),
    ];
  }
}

/// Provider for the preference notifier.
final preferenceProvider =
    StateNotifierProvider<PreferenceNotifier, AsyncValue<PreferenceVector>>(
        (ref) {
  final storage = ref.watch(localStorageProvider);
  return PreferenceNotifier.local(storage);
});
