import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/idea.dart';
import '../models/swipe.dart';
import '../services/api_service.dart';
import 'idea_provider.dart';

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
/// Records swipe events via the API and updates the idea stack.
class SwipeNotifier extends StateNotifier<SwipeState> {
  final ApiService _api;
  final IdeaStackNotifier _ideaStack;

  SwipeNotifier(this._api, this._ideaStack) : super(const SwipeState());

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
      );

      await _api.recordSwipe(record);
      _ideaStack.removeCurrent();

      state = state.copyWith(
        isSubmitting: false,
        totalSwipes: state.totalSwipes + 1,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Clear any error state.
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Provider for the swipe notifier.
final swipeProvider = StateNotifierProvider<SwipeNotifier, SwipeState>((ref) {
  final api = ref.watch(apiServiceProvider);
  final ideaStack = ref.watch(ideaStackProvider.notifier);
  return SwipeNotifier(api, ideaStack);
});
