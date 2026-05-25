import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/idea.dart';
import '../models/swipe.dart';
import '../models/preference.dart';

/// HTTP client for all REST API endpoints.
///
/// Base URL defaults to localhost:3000 (Integration Agent).
/// All methods return typed models with proper error handling.
class ApiService {
  final http.Client _client;
  final String baseUrl;

  ApiService({
    http.Client? client,
    this.baseUrl = 'http://10.0.2.2:3000',
  }) : _client = client ?? http.Client();

  /// Close the underlying HTTP client.
  void dispose() => _client.close();

  // ── Ideas ─────────────────────────────────────────────────

  /// Fetch the next recommended idea from the API.
  Future<Idea> fetchNextIdea({List<int> excludeIds = const []}) async {
    final uri = Uri.parse('$baseUrl/api/ideas/next').replace(
      queryParameters:
          excludeIds.isEmpty ? null : {'exclude_ids': excludeIds.join(',')},
    );
    final response =
        await _client.get(uri).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      if (json['success'] == true && json['data'] != null) {
        return Idea.fromJson(json['data'] as Map<String, dynamic>);
      }
      throw ApiException('Invalid response: missing data', 200);
    }
    throw ApiException('Failed to fetch idea', response.statusCode);
  }

  // ── Swipe ─────────────────────────────────────────────────

  /// Record a swipe action.
  Future<SwipeResult> recordSwipe(SwipeRecord record) async {
    final uri = Uri.parse('$baseUrl/api/swipe');
    final response = await _client
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(record.toJson()),
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode == 200 || response.statusCode == 201) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return SwipeResult.fromJson(json);
    }
    throw ApiException('Failed to record swipe', response.statusCode);
  }

  // ── Preferences ───────────────────────────────────────────

  /// Fetch the current preference vector.
  Future<PreferenceVector> fetchPreferences() async {
    final uri = Uri.parse('$baseUrl/api/preferences');
    final response =
        await _client.get(uri).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return PreferenceVector.fromJson(json);
    }
    throw ApiException('Failed to fetch preferences', response.statusCode);
  }

  /// Update the preference vector.
  Future<PreferenceVector> updatePreferences(
      PreferenceVector preferences) async {
    final uri = Uri.parse('$baseUrl/api/preferences');
    final response = await _client
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(preferences.toJson()),
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return PreferenceVector.fromJson(json);
    }
    throw ApiException('Failed to update preferences', response.statusCode);
  }

  // ── History ────────────────────────────────────────────────

  /// Fetch paginated swipe history.
  Future<HistoryResponse> fetchHistory({
    int page = 1,
    int limit = 20,
    String? filter,
  }) async {
    final params = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (filter != null) params['filter'] = filter;

    final uri =
        Uri.parse('$baseUrl/api/history').replace(queryParameters: params);
    final response =
        await _client.get(uri).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return HistoryResponse.fromJson(json);
    }
    throw ApiException('Failed to fetch history', response.statusCode);
  }
}

/// Typed exception for API errors.
class ApiException implements Exception {
  final String message;
  final int statusCode;

  const ApiException(this.message, this.statusCode);

  @override
  String toString() => 'ApiException($statusCode): $message';
}
