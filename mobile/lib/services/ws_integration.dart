import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/environment.dart';
import '../models/idea.dart';
import '../models/preference.dart';

/// Events emitted by [WebSocketIntegration].
sealed class WsEvent {
  const WsEvent();
}

/// A new idea arrived from the server.
final class WsNewIdeaEvent extends WsEvent {
  final Idea idea;
  const WsNewIdeaEvent(this.idea);
}

/// A preference update acknowledgment.
final class WsPreferenceUpdateEvent extends WsEvent {
  final PreferenceVector? preferences;
  final bool acknowledged;
  const WsPreferenceUpdateEvent({
    this.preferences,
    this.acknowledged = true,
  });
}

/// A generic/unknown event received from the server.
final class WsUnknownEvent extends WsEvent {
  final Map<String, dynamic> data;
  const WsUnknownEvent(this.data);
}

/// Enhanced WebSocket integration with auto-connect, event handling,
/// and send capabilities.
///
/// Extends the pattern from [WebSocketService] (websocket_service.dart) with:
///   - Ability to send messages (request_more, etc.)
///   - Preference update acknowledgment handling
///   - Typed event stream via [WsEvent]
///   - Callback on successful reconnect
///
/// Exponential backoff reconnection:
///   1s → 2s → 4s → 8s → 16s → 30s max
class WebSocketIntegration {
  final String _wsUrl;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  bool _disposed = false;

  static const Duration _maxReconnectDelay = Duration(seconds: 30);
  static const Duration _initialReconnectDelay = Duration(seconds: 1);

  /// Broadcasts typed [WsEvent] objects to all listeners.
  final StreamController<WsEvent> _eventController =
      StreamController<WsEvent>.broadcast();

  /// Stream of all typed WebSocket events.
  Stream<WsEvent> get eventStream => _eventController.stream;

  /// Convenience stream filtered to [WsNewIdeaEvent] only.
  Stream<Idea> get ideaStream =>
      eventStream.whereType<WsNewIdeaEvent>().map((e) => e.idea);

  /// Convenience stream filtered to [WsPreferenceUpdateEvent] only.
  Stream<WsPreferenceUpdateEvent> get preferenceUpdateStream =>
      eventStream.whereType<WsPreferenceUpdateEvent>();

  /// Whether the service is currently connected.
  bool _connected = false;
  bool get isConnected => _connected;

  /// Called after a successful reconnect (after a disconnect).
  void Function()? onReconnect;

  WebSocketIntegration({
    String? wsUrl,
    this.onReconnect,
  }) : _wsUrl = wsUrl ?? AppEnvironment.current.wsUrl;

  // ── Lifecycle ──────────────────────────────────────────────

  /// Connect (or reconnect) to the WebSocket server.
  void connect() {
    if (_disposed) return;
    _reconnectAttempts = 0;
    _doConnect();
  }

  void _doConnect() {
    if (_disposed) return;
    try {
      final uri = Uri.parse(_wsUrl);
      _channel = WebSocketChannel.connect(uri);
      _connected = true;
      _reconnectAttempts = 0;

      _subscription = _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );
    } catch (e) {
      _connected = false;
      _scheduleReconnect();
    }
  }

  /// Gracefully disconnect without reconnecting.
  void disconnect() {
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    _connected = false;
  }

  /// Close the WebSocket permanently and cancel all timers.
  void dispose() {
    _disposed = true;
    disconnect();
    _eventController.close();
  }

  // ── Sending messages ───────────────────────────────────────

  /// Send a raw JSON-serialisable object through the WebSocket.
  void send(Map<String, dynamic> message) {
    if (!_connected || _channel == null) return;
    try {
      _channel!.sink.add(jsonEncode(message));
    } catch (_) {
      // Ignore send failures — will be handled by reconnect.
    }
  }

  /// Request more ideas when the local buffer is running low.
  void requestMore({int count = 5}) {
    send({'type': 'request_more', 'count': count});
  }

  // ── Message handling ───────────────────────────────────────

  void _onMessage(dynamic message) {
    try {
      final json = jsonDecode(message as String) as Map<String, dynamic>;
      final type = json['type'] as String?;

      switch (type) {
        case 'new_idea':
          if (json['data'] != null) {
            final idea =
                Idea.fromJson(json['data'] as Map<String, dynamic>);
            _eventController.add(WsNewIdeaEvent(idea));
          }
        case 'preference_update':
          final data = json['data'] as Map<String, dynamic>?;
          _eventController.add(WsPreferenceUpdateEvent(
            acknowledged: json['acknowledged'] as bool? ?? true,
            preferences:
                data != null ? PreferenceVector.fromJson(data) : null,
          ));
        default:
          _eventController.add(WsUnknownEvent(json));
      }
    } catch (_) {
      // Ignore malformed messages — log in production.
    }
  }

  void _onError(Object error) {
    _connected = false;
    _scheduleReconnect();
  }

  void _onDone() {
    _connected = false;
    if (!_disposed) _scheduleReconnect();
  }

  // ── Reconnection ───────────────────────────────────────────

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    if (_disposed) return;

    final delay = _calculateDelay();
    _reconnectTimer = Timer(delay, () {
      if (!_disposed) {
        _doConnect();
        onReconnect?.call();
      }
    });
  }

  Duration _calculateDelay() {
    final ms = _initialReconnectDelay.inMilliseconds *
        (1 << _reconnectAttempts.clamp(0, 5));
    _reconnectAttempts++;
    return Duration(
        milliseconds: ms.clamp(0, _maxReconnectDelay.inMilliseconds));
  }
}
