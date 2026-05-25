import 'package:dio/dio.dart';
import '../config/environment.dart';
import '../models/idea.dart';
import '../models/swipe.dart';
import '../models/preference.dart';

/// Dio-based HTTP client with full endpoint coverage and interceptors.
///
/// Extends the concept of [ApiService] (from api_service.dart) with:
///   - Dio HTTP client for richer request/response handling
///   - Logging interceptor for debug visibility
///   - Error interceptor that surfaces typed [ApiIntegrationException]
///   - Configurable base URL from [AppEnvironment]
///
/// All methods return typed models and throw [ApiIntegrationException]
/// on non-2xx responses or network errors.
class ApiIntegrationService {
  final Dio _dio;

  ApiIntegrationService({
    AppEnvironment? env,
    Dio? dio,
  }) : _dio = dio ?? _createDio(env ?? AppEnvironment.current);

  /// Build a Dio instance with logging and error interceptors.
  static Dio _createDio(AppEnvironment env) {
    final dio = Dio(
      BaseOptions(
        baseUrl: env.baseUrl,
        connectTimeout: env.connectTimeout,
        receiveTimeout: env.requestTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Logging interceptor — prints request/response in debug builds.
    dio.interceptors.add(
      LogInterceptor(
        request: true,
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (obj) {
          // In production, route to a proper logger.
          // ignore: avoid_print
          print('[API] $obj');
        },
      ),
    );

    // Error interceptor — normalises all errors into typed exceptions.
    dio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) {
          final statusCode = error.response?.statusCode;
          final message = _extractMessage(error);
          handler.next(
            DioException(
              requestOptions: error.requestOptions,
              response: error.response,
              type: error.type,
              error: ApiIntegrationException(message, statusCode ?? 0),
              message: message,
            ),
          );
        },
      ),
    );

    return dio;
  }

  /// Extract a human-readable message from the error response body.
  static String _extractMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      return (data['message'] as String?) ??
          (data['error'] as String?) ??
          error.message ??
          'Unknown error';
    }
    return error.message ?? 'Network error';
  }

  /// Dispose the underlying Dio client.
  void dispose() {
    _dio.close(force: true);
  }

  // ── Ideas ───────────────────────────────────────────────────

  /// Fetch the next recommended idea.
  Future<Idea> fetchNextIdea() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/api/ideas/next');
      final body = response.data;
      if (body != null && body['success'] == true && body['data'] != null) {
        return Idea.fromJson(body['data'] as Map<String, dynamic>);
      }
      throw const ApiIntegrationException(
          'Invalid response: missing data', 200);
    } on DioException catch (e) {
      throw e.error is ApiIntegrationException
          ? e.error as ApiIntegrationException
          : ApiIntegrationException(e.message ?? 'Network error', 0);
    }
  }

  // ── Swipe ───────────────────────────────────────────────────

  /// Record a swipe action.
  Future<SwipeResult> postSwipe(SwipeRecord record) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/swipe',
        data: record.toJson(),
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        return SwipeResult.fromJson(body);
      }
      throw ApiIntegrationException(
        body?['message'] as String? ?? 'Swipe failed',
        response.statusCode ?? 200,
      );
    } on DioException catch (e) {
      throw e.error is ApiIntegrationException
          ? e.error as ApiIntegrationException
          : ApiIntegrationException(e.message ?? 'Swipe network error', 0);
    }
  }

  // ── Preferences ─────────────────────────────────────────────

  /// Fetch the current preference vector.
  Future<PreferenceVector> getPreferences() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/api/preferences');
      final body = response.data;
      if (body != null && body['success'] == true) {
        return PreferenceVector.fromJson(body);
      }
      throw ApiIntegrationException(
        'Failed to fetch preferences',
        response.statusCode ?? 200,
      );
    } on DioException catch (e) {
      throw e.error is ApiIntegrationException
          ? e.error as ApiIntegrationException
          : ApiIntegrationException(e.message ?? 'Network error', 0);
    }
  }

  /// Update the preference vector.
  Future<PreferenceVector> updatePreferences(
      PreferenceVector preferences) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/preferences',
        data: preferences.toJson(),
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        return PreferenceVector.fromJson(body);
      }
      throw ApiIntegrationException(
        'Failed to update preferences',
        response.statusCode ?? 200,
      );
    } on DioException catch (e) {
      throw e.error is ApiIntegrationException
          ? e.error as ApiIntegrationException
          : ApiIntegrationException(e.message ?? 'Network error', 0);
    }
  }

  // ── History ─────────────────────────────────────────────────

  /// Fetch paginated swipe history.
  Future<HistoryResponse> getHistory({
    int page = 1,
    int limit = 20,
    String? direction,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (direction != null) queryParams['direction'] = direction;

      final response = await _dio.get<Map<String, dynamic>>(
        '/api/history',
        queryParameters: queryParams,
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        return HistoryResponse.fromJson(body);
      }
      throw ApiIntegrationException(
        'Failed to fetch history',
        response.statusCode ?? 200,
      );
    } on DioException catch (e) {
      throw e.error is ApiIntegrationException
          ? e.error as ApiIntegrationException
          : ApiIntegrationException(e.message ?? 'Network error', 0);
    }
  }
}

/// Typed exception for API integration errors.
///
/// Carries both a human-readable [message] and the HTTP [statusCode].
class ApiIntegrationException implements Exception {
  final String message;
  final int statusCode;

  const ApiIntegrationException(this.message, this.statusCode);

  /// Whether the error is a client error (4xx).
  bool get isClientError => statusCode >= 400 && statusCode < 500;

  /// Whether the error is a server error (5xx).
  bool get isServerError => statusCode >= 500;

  /// Whether the error is likely transient (network or 5xx).
  bool get isTransient => statusCode == 0 || isServerError;

  @override
  String toString() => 'ApiIntegrationException($statusCode): $message';
}
