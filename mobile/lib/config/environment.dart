/// Environment configuration for the Grad Hub mobile app.
///
/// Provides base URLs, WebSocket URL, timeout settings, and
/// dev/production switching — all in one place.
///
/// Usage:
/// ```dart
/// final env = AppEnvironment.current;
/// final baseUrl = env.baseUrl;
/// ```
class AppEnvironment {
  final String name;
  final String baseUrl;
  final String wsUrl;
  final Duration requestTimeout;
  final Duration connectTimeout;

  const AppEnvironment._({
    required this.name,
    required this.baseUrl,
    required this.wsUrl,
    this.requestTimeout = const Duration(seconds: 10),
    this.connectTimeout = const Duration(seconds: 5),
  });

  // ── Predefined environments ─────────────────────────────────

  /// Local development — points to the backend running on localhost:3000.
  static const AppEnvironment development = AppEnvironment._(
    name: 'development',
    baseUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws/stream',
  );

  /// Production — override URLs via env or config file.
  static const AppEnvironment production = AppEnvironment._(
    name: 'production',
    baseUrl: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws/stream',
    requestTimeout: Duration(seconds: 15),
    connectTimeout: Duration(seconds: 10),
  );

  /// Shortcut for common API paths.
  String get apiIdeasNext => '$baseUrl/api/ideas/next';
  String get apiSwipe => '$baseUrl/api/swipe';
  String get apiPreferences => '$baseUrl/api/preferences';
  String get apiHistory => '$baseUrl/api/history';

  // ── Active environment ──────────────────────────────────────

  /// The currently active environment.
  /// Override this at app startup (e.g. from --dart-define).
  static AppEnvironment current = development;
}
