import 'dart:async';
import '../models/swipe.dart';
import 'api_integration.dart';

/// Represents a queued operation that failed due to connectivity.
final class PendingOperation {
  final String id;
  final SwipeRecord record;
  final DateTime createdAt;
  int retryCount;

  PendingOperation({
    required this.id,
    required this.record,
    DateTime? createdAt,
    this.retryCount = 0,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'idea_id': record.ideaId,
        'direction': record.direction.name,
        'dwell_time_ms': record.dwellTimeMs,
        'created_at': createdAt.toIso8601String(),
        'retry_count': retryCount,
      };
}

/// State of the sync service.
enum SyncStatus {
  /// All queued operations have been processed.
  idle,

  /// There are pending operations waiting for connectivity.
  pending,

  /// Actively retrying queued operations.
  syncing,

  /// A sync operation failed.
  error,
}

/// Offline/online sync queue for failed API operations.
///
/// When a swipe POST fails (network error or transient server error),
/// it is queued in memory. When connectivity is restored, the service
/// replays queued operations in FIFO order.
///
/// Conflict resolution: server timestamp wins — the queued operation
/// is best-effort; the server is the source of truth for preference
/// state and swipe ordering.
class SyncService {
  final ApiIntegrationService _api;
  final List<PendingOperation> _queue = [];
  bool _isSyncing = false;
  bool _paused = false;

  /// Fires when the sync status changes.
  final StreamController<SyncStatus> _statusController =
      StreamController<SyncStatus>.broadcast();
  Stream<SyncStatus> get statusStream => _statusController.stream;

  /// Current sync status.
  SyncStatus _status = SyncStatus.idle;
  SyncStatus get status => _status;

  /// Number of pending operations in the queue.
  int get pendingCount => _queue.length;

  SyncService({required ApiIntegrationService api}) : _api = api;

  // ── Queue management ───────────────────────────────────────

  /// Enqueue a failed swipe operation for later retry.
  ///
  /// Returns a unique operation ID for tracking.
  String enqueue(SwipeRecord record) {
    final operation = PendingOperation(
      id: _generateId(),
      record: record,
    );
    _queue.add(operation);
    _updateStatus(SyncStatus.pending);
    return operation.id;
  }

  /// Remove a pending operation from the queue by ID.
  void dequeue(String operationId) {
    _queue.removeWhere((op) => op.id == operationId);
    if (_queue.isEmpty) {
      _updateStatus(SyncStatus.idle);
    }
  }

  /// Clear all pending operations.
  void clear() {
    _queue.clear();
    _updateStatus(SyncStatus.idle);
  }

  /// Pause/resume the sync process.
  void setPaused(bool paused) {
    _paused = paused;
  }

  // ── Sync execution ─────────────────────────────────────────

  /// Attempt to replay all queued operations.
  ///
  /// Operations that succeed are removed from the queue.
  /// Operations that fail again remain queued for the next retry.
  /// Server timestamp wins — we don't overwrite server data on conflict.
  Future<void> syncNow() async {
    if (_isSyncing || _paused || _queue.isEmpty) return;

    _isSyncing = true;
    _updateStatus(SyncStatus.syncing);

    final snapshot = _queue.toList();
    for (final operation in snapshot) {
      try {
        // Best-effort: if server rejects (e.g. stale timestamp),
        // we discard the operation (server wins).
        await _api.postSwipe(operation.record);
        dequeue(operation.id);
      } catch (e) {
        operation.retryCount++;
        // If the error is a client error (4xx), drop it —
        // the server has spoken.
        if (e is ApiIntegrationException && e.isClientError) {
          dequeue(operation.id);
        }
        // Otherwise, keep in queue for next retry.
      }
    }

    _isSyncing = false;
    _updateStatus(
      _queue.isEmpty ? SyncStatus.idle : SyncStatus.pending,
    );
  }

  // ── Connectivity handlers ──────────────────────────────────

  /// Called when connectivity is restored.
  ///
  /// Triggers an immediate sync of all pending operations.
  void onConnectivityRestored() {
    syncNow();
  }

  /// Called when connectivity is lost.
  ///
  /// Pauses the sync process until connectivity returns.
  void onConnectivityLost() {
    // Nothing to do — sync will be paused naturally.
    // Could add exponential backoff logic if needed.
  }

  // ── Helpers ────────────────────────────────────────────────

  String _generateId() {
    return 'op_${DateTime.now().microsecondsSinceEpoch}_${_queue.length}';
  }

  void _updateStatus(SyncStatus newStatus) {
    if (_status == newStatus) return;
    _status = newStatus;
    _statusController.add(newStatus);
  }

  /// Dispose the service.
  void dispose() {
    _statusController.close();
  }
}
