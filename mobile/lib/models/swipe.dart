/// Direction of a swipe gesture.
enum SwipeDirection {
  /// Swiped left — dislike / nope.
  left,

  /// Swiped right — like.
  right,

  /// Swiped up — superlike.
  up,
}

/// Records a single swipe interaction for API submission and history.
class SwipeRecord {
  final int ideaId;
  final SwipeDirection direction;
  final double? rating;
  final int dwellTimeMs;
  final DateTime timestamp;

  SwipeRecord({
    required this.ideaId,
    required this.direction,
    this.rating,
    this.dwellTimeMs = 0,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now().toUtc();

  factory SwipeRecord.fromJson(Map<String, dynamic> json) {
    return SwipeRecord(
      ideaId: json['idea_id'] as int,
      direction: SwipeDirection.values.firstWhere(
        (d) => d.name == json['direction'],
        orElse: () => SwipeDirection.right,
      ),
      rating: (json['rating'] as num?)?.toDouble(),
      dwellTimeMs: (json['dwell_time_ms'] as int?) ?? 0,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() => {
        'idea_id': ideaId,
        'direction': direction.name,
        if (rating != null) 'rating': rating,
        'dwell_time_ms': dwellTimeMs,
        'timestamp': timestamp.toIso8601String(),
      };
}

/// API response from POST /api/swipe.
class SwipeResult {
  final bool success;
  final bool preferenceUpdated;

  const SwipeResult({
    required this.success,
    this.preferenceUpdated = false,
  });

  factory SwipeResult.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>?;
    return SwipeResult(
      success: json['success'] as bool? ?? false,
      preferenceUpdated: data?['preference_updated'] as bool? ?? false,
    );
  }
}

/// Paginated history response from GET /api/history.
class HistoryResponse {
  final List<SwipeRecord> items;
  final int page;
  final int limit;
  final int total;
  final bool hasMore;

  const HistoryResponse({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    this.hasMore = false,
  });

  factory HistoryResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as List<dynamic>? ?? [];
    final meta = json['meta'] as Map<String, dynamic>? ?? {};
    return HistoryResponse(
      items: data
          .map((e) => SwipeRecord.fromJson(e as Map<String, dynamic>))
          .toList(),
      page: (meta['page'] as int?) ?? 1,
      limit: (meta['limit'] as int?) ?? 20,
      total: (meta['total'] as int?) ?? 0,
      hasMore: (meta['has_more'] as bool?) ?? false,
    );
  }
}
