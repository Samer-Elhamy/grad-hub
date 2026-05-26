import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/fallback_ideas.dart';
import '../models/idea.dart';
import '../config/environment.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';

/// Provider for the API service.
final apiServiceProvider = Provider<ApiService>((ref) {
  final service = ApiService(baseUrl: AppEnvironment.current.baseUrl);
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for the WebSocket service (lazy singleton).
final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  final service = WebSocketService(wsUrl: AppEnvironment.current.wsUrl);
  ref.onDispose(() => service.dispose());
  return service;
});

/// State holder for the idea stack.
///
/// Manages a queue of [Idea] cards:
///   - Loads bundled local ideas immediately
///   - Removes top card after swipe
///   - Fetches more when stack runs low
class IdeaStackNotifier extends StateNotifier<AsyncValue<List<Idea>>> {
  IdeaStackNotifier(ApiService api, WebSocketService ws)
      : super(const AsyncLoading()) {
    _init();
  }

  Future<void> _init() async {
    state = AsyncData(_fallbackIdeas(count: 3));
  }

  List<Idea> _fallbackIdeas({
    required int count,
    List<int> excludedIds = const [],
  }) {
    final excluded = excludedIds.toSet();
    final fresh = fallbackIdeas
        .where((idea) => !excluded.contains(idea.id))
        .take(count)
        .toList();
    if (fresh.isNotEmpty) return fresh;
    return fallbackIdeas.take(count).toList();
  }

  List<Idea> _mergeUnique(List<Idea> primary, List<Idea> secondary) {
    final seen = <int>{};
    return [
      ...primary,
      ...secondary,
    ].where((idea) => seen.add(idea.id)).toList();
  }

  /// Add a single idea to the end of the stack (from WebSocket).
  void _addIdea(Idea idea) {
    state.whenData((ideas) {
      if (ideas.contains(idea)) return;
      state = AsyncData([...ideas, idea]);
    });
  }

  /// Remove the current (top) card after a swipe.
  void removeCurrent() {
    state.whenData((ideas) {
      if (ideas.isEmpty) return;
      final updated = [...ideas]..removeAt(0);

      // Fetch more if running low.
      if (updated.length < 2) {
        final seeded = _mergeUnique(
          updated,
          _fallbackIdeas(
            count: 2 - updated.length,
            excludedIds: updated.map((idea) => idea.id).toList(),
          ),
        );
        state = AsyncData(seeded);
      } else {
        state = AsyncData(updated);
      }
    });
  }

  /// Manually fetch and push the next idea.
  Future<void> fetchNext() async {
    final activeIds =
        state.value?.map((idea) => idea.id).toList() ?? const <int>[];
    final fallback = _fallbackIdeas(count: 1, excludedIds: activeIds);
    if (fallback.isNotEmpty) {
      _addIdea(fallback.first);
    }
  }

  /// The current top idea (for display), or null if empty.
  Idea? get currentIdea {
    return state.whenOrNull(
        data: (ideas) => ideas.isNotEmpty ? ideas[0] : null);
  }

  /// Number of ideas remaining in the stack.
  int get remainingCount {
    return state.whenOrNull(data: (ideas) => ideas.length) ?? 0;
  }

}

/// Provider for the idea stack notifier.
final ideaStackProvider =
    StateNotifierProvider<IdeaStackNotifier, AsyncValue<List<Idea>>>((ref) {
  final api = ref.watch(apiServiceProvider);
  final ws = ref.watch(webSocketServiceProvider);
  return IdeaStackNotifier(api, ws);
});
