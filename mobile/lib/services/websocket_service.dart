import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/idea.dart';

/// WebSocket client for receiving real-time idea streams.
///
/// Connects to /ws/stream and emits parsed [Idea] objects.
/// Implements auto-reconnect with exponential backoff:
///   1s → 2s → 4s → 8s → 16s → max 30s
class WebSocketService {
  final String _wsUrl;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  bool _disposed = false;

  /// Maximum delay between reconnect attempts (30 seconds).
  static const Duration _maxReconnectDelay = Duration(seconds: 30);

  /// Initial reconnect delay.
  static const Duration _initialReconnectDelay = Duration(seconds: 1);

  /// Broadcasts parsed [Idea] objects to all listeners.
  final StreamController<Idea> _ideaController =
      StreamController<Idea>.broadcast();

  /// Stream of new ideas received via WebSocket.
  Stream<Idea> get ideaStream => _ideaController.stream;

  /// Whether the service is currently connected.
  bool _connected = false;
  bool get isConnected => _connected;

  WebSocketService({required String wsUrl}) : _wsUrl = wsUrl;

  /// Connect to the WebSocket server.
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

  void _onMessage(dynamic message) {
    try {
      final json = jsonDecode(message as String) as Map<String, dynamic>;
      final type = json['type'] as String?;

      if (type == 'new_idea' && json['data'] != null) {
        final idea = Idea.fromJson(json['data'] as Map<String, dynamic>);
        _ideaController.add(idea);
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

  /// Schedule a reconnect with exponential backoff.
  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    if (_disposed) return;

    final delay = _calculateDelay();
    _reconnectTimer = Timer(delay, () {
      if (!_disposed) _doConnect();
    });
  }

  Duration _calculateDelay() {
    final ms = _initialReconnectDelay.inMilliseconds *
        (1 << _reconnectAttempts.clamp(0, 5));
    _reconnectAttempts++;
    return Duration(
        milliseconds: ms.clamp(0, _maxReconnectDelay.inMilliseconds));
  }

  /// Close the WebSocket and cancel all timers.
  void dispose() {
    _disposed = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    _ideaController.close();
  }
}
