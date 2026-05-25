/// Represents a project idea for the swipe feed.
///
/// Mirrors the API response from GET /api/ideas/next
/// and fields from the existing web app's ideas.json schema.
class Idea {
  final int id;
  final String title;
  final String? titleAr;
  final String? description;
  final String? category;
  final String? university;
  final String? universityLocation;
  final String? difficulty;
  final List<String> technologies;
  final List<String> tags;
  final String? imageUrl;
  final DateTime? createdAt;

  const Idea({
    required this.id,
    required this.title,
    this.titleAr,
    this.description,
    this.category,
    this.university,
    this.universityLocation,
    this.difficulty,
    this.technologies = const [],
    this.tags = const [],
    this.imageUrl,
    this.createdAt,
  });

  factory Idea.fromJson(Map<String, dynamic> json) {
    return Idea(
      id: json['id'] as int,
      title: (json['title_en'] ?? json['title'] ?? json['title_ar'] ?? '') as String,
      titleAr: json['title_ar'] as String?,
      description: json['description'] as String?,
      category: json['category'] as String?,
      university: json['university'] as String?,
      universityLocation: json['university_location'] as String?,
      difficulty: json['difficulty'] as String?,
      technologies: _parseStringList(json['technologies']),
      tags: _parseStringList(json['tags']),
      imageUrl: json['image_url'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'title_ar': titleAr,
        'description': description,
        'category': category,
        'university': university,
        'university_location': universityLocation,
        'difficulty': difficulty,
        'technologies': technologies,
        'tags': tags,
        'image_url': imageUrl,
        'created_at': createdAt?.toIso8601String(),
      };

  static List<String> _parseStringList(dynamic value) {
    if (value is List) return value.whereType<String>().toList();
    if (value is String && value.isNotEmpty) return [value];
    return [];
  }

  /// Difficulty displayed as filled circles (•).
  String get difficultyDisplay {
    switch (difficulty?.toLowerCase()) {
      case 'مبتدئ':
      case 'beginner':
      case 'easy':
        return '•';
      case 'متوسط':
      case 'intermediate':
      case 'medium':
        return '••';
      case 'متقدم':
      case 'advanced':
      case 'hard':
        return '•••';
      default:
        return '••';
    }
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Idea && id == other.id);

  @override
  int get hashCode => id.hashCode;
}
