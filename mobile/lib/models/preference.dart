/// Category preference with a weight score.
class CategoryPreference {
  final String category;
  final double weight;

  const CategoryPreference({required this.category, required this.weight});

  factory CategoryPreference.fromJson(Map<String, dynamic> json) {
    return CategoryPreference(
      category: json['category'] as String,
      weight: (json['weight'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'category': category,
        'weight': weight,
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CategoryPreference && category == other.category);

  @override
  int get hashCode => category.hashCode;
}

/// Represents the user's preference vector — what they like/dislike.
///
/// Mirrors the API response from GET /api/preferences
/// and the existing web app's preference.json schema.
class PreferenceVector {
  final List<CategoryPreference> likedCategories;
  final List<String> excludedCategories;
  final List<String> keywords;
  final int totalSwipes;
  final double averageRating;

  const PreferenceVector({
    this.likedCategories = const [],
    this.excludedCategories = const [],
    this.keywords = const [],
    this.totalSwipes = 0,
    this.averageRating = 0,
  });

  factory PreferenceVector.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? json;
    final liked = data['liked_categories'] as List<dynamic>? ?? [];
    final excluded = data['excluded_categories'] as List<dynamic>? ?? [];
    return PreferenceVector(
      likedCategories: liked
          .map((e) =>
              CategoryPreference.fromJson(e as Map<String, dynamic>))
          .toList(),
      excludedCategories: excluded.whereType<String>().toList(),
      keywords: (data['keywords'] as List<dynamic>?)
              ?.whereType<String>()
              .toList() ??
          [],
      totalSwipes: (data['total_swipes'] as int?) ?? 0,
      averageRating: (data['average_rating'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'liked_categories':
            likedCategories.map((e) => e.toJson()).toList(),
        'excluded_categories': excludedCategories,
        'keywords': keywords,
      };

  /// Whether a category is explicitly liked.
  bool isCategoryLiked(String category) =>
      likedCategories.any((c) => c.category == category);

  /// Whether a category is excluded.
  bool isCategoryExcluded(String category) =>
      excludedCategories.contains(category);

  /// All unique category names from liked preferences.
  List<String> get allLikedCategoryNames =>
      likedCategories.map((c) => c.category).toList();
}
