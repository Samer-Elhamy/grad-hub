import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  // Connect on first access.
  service.connect();
  return service;
});

/// State holder for the idea stack.
///
/// Manages a queue of [Idea] cards:
///   - Fetches initial batch from API
///   - Receives live ideas from WebSocket
///   - Removes top card after swipe
///   - Fetches more when stack runs low
class IdeaStackNotifier extends StateNotifier<AsyncValue<List<Idea>>> {
  final ApiService _api;
  final WebSocketService _ws;
  StreamSubscription<Idea>? _wsSubscription;

  IdeaStackNotifier(this._api, this._ws) : super(const AsyncLoading()) {
    _init();
  }

  Future<void> _init() async {
    // Listen for new ideas from WebSocket.
    _wsSubscription = _ws.ideaStream.listen(_addIdea);

    try {
      final initialIdeas = await _fetchBatch(3);
      if (initialIdeas.isEmpty) {
        state = const AsyncData([]);
      } else {
        state = AsyncData(initialIdeas);
      }
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  /// Fetch a batch of ideas from the API.
  Future<List<Idea>> _fetchBatch(int count) async {
    final ideas = <Idea>[];
    for (var i = 0; i < count; i++) {
      try {
        final existingIds = state.whenOrNull(
              data: (items) => items.map((idea) => idea.id),
            ) ??
            const <int>[];
        final activeIds = [
          ...ideas.map((idea) => idea.id),
          ...existingIds,
        ];
        final idea = await _api.fetchNextIdea(excludeIds: activeIds);
        if (!ideas.contains(idea)) ideas.add(idea);
      } catch (_) {
        break;
      }
    }
    return ideas;
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
        _fetchBatch(2).then((newIdeas) {
          state = AsyncData([...updated, ...newIdeas]);
        });
        state = AsyncData(updated);
      } else {
        state = AsyncData(updated);
      }
    });
  }

  /// Manually fetch and push the next idea.
  Future<void> fetchNext() async {
    try {
      final activeIds = state.whenOrNull(
            data: (ideas) => ideas.map((idea) => idea.id).toList(),
          ) ??
          const <int>[];
      final idea = await _api.fetchNextIdea(excludeIds: activeIds);
      _addIdea(idea);
    } catch (e, st) {
      state = AsyncError(e, st);
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

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}

/// Provider for the idea stack notifier.
final ideaStackProvider =
    StateNotifierProvider<IdeaStackNotifier, AsyncValue<List<Idea>>>((ref) {
  final api = ref.watch(apiServiceProvider);
  final ws = ref.watch(webSocketServiceProvider);
  return IdeaStackNotifier(api, ws);
});
