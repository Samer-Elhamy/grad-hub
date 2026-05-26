import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/idea.dart';
import '../models/swipe.dart';
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import 'idea_provider.dart';
import 'local_storage_provider.dart';
import 'preference_provider.dart';

/// State for the swipe operation.
class SwipeState {
  final bool isSubmitting;
  final String? error;
  final int totalSwipes;

  const SwipeState({
    this.isSubmitting = false,
    this.error,
    this.totalSwipes = 0,
  });

  SwipeState copyWith({
    bool? isSubmitting,
    String? error,
    int? totalSwipes,
  }) {
    return SwipeState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: error,
      totalSwipes: totalSwipes ?? this.totalSwipes,
    );
  }
}

/// Manages the swipe action lifecycle.
///
/// Records swipe events locally and updates the idea stack.
class SwipeNotifier extends StateNotifier<SwipeState> {
  final ApiService? _api;
  final LocalStorageService? _storage;
  final IdeaStackNotifier _ideaStack;
  final PreferenceNotifier? _preferences;

  SwipeNotifier(ApiService api, this._ideaStack)
      : _api = api,
        _storage = null,
        _preferences = null,
        super(const SwipeState());

  SwipeNotifier.local(
    LocalStorageService storage,
    this._ideaStack,
    PreferenceNotifier preferences,
  )   : _api = null,
        _storage = storage,
        _preferences = preferences,
        super(const SwipeState());

  /// Record a swipe in the given direction for the [idea].
  ///
  /// Returns true if the swipe was recorded successfully.
  Future<bool> recordSwipe({
    required Idea idea,
    required SwipeDirection direction,
    int dwellTimeMs = 0,
  }) async {
    if (state.isSubmitting) return false;

    state = state.copyWith(isSubmitting: true, error: null);

    try {
      final record = SwipeRecord(
        ideaId: idea.id,
        direction: direction,
        dwellTimeMs: dwellTimeMs,
        idea: idea,
      );

      final storage = _storage;
      if (storage != null) {
        await storage.saveSwipe(record);
        await _preferences?.applySwipeFeedback(idea, direction);
      } else {
        await _api!.recordSwipe(record);
      }
      _ideaStack.removeCurrent();

      state = state.copyWith(
        isSubmitting: false,
        totalSwipes: state.totalSwipes + 1,
      );
      return true;
    } catch (e) {
      _ideaStack.removeCurrent();
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
        totalSwipes: state.totalSwipes + 1,
      );
      return true;
    }
  }

  /// Clear any error state.
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Provider for the swipe notifier.
final swipeProvider = StateNotifierProvider<SwipeNotifier, SwipeState>((ref) {
  final storage = ref.watch(localStorageProvider);
  final ideaStack = ref.watch(ideaStackProvider.notifier);
  final preferences = ref.watch(preferenceProvider.notifier);
  return SwipeNotifier.local(storage, ideaStack, preferences);
});
