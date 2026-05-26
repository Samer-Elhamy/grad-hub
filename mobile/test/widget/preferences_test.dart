import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grad_hub_mobile/models/preference.dart';
import 'package:grad_hub_mobile/providers/idea_provider.dart';
import 'package:grad_hub_mobile/providers/preference_provider.dart';
import 'package:grad_hub_mobile/screens/preferences_screen.dart';
import 'package:grad_hub_mobile/services/api_service.dart';

void main() {
  group('PreferenceVector', () {
    test('parses backend category and keyword weights', () {
      final prefs = PreferenceVector.fromJson({
        'success': true,
        'data': {
          'category_weights': {
            'Machine Learning': 0.9,
            'Web Development': 0.7,
          },
          'excluded_categories': ['DevOps'],
          'keyword_weights': {
            'ai': 0.8,
            'flutter': 0.6,
          },
          'total_swipes': 12,
          'average_rating': 4.2,
        },
      });

      expect(prefs.likedCategories.map((item) => item.category), [
        'Machine Learning',
        'Web Development',
      ]);
      expect(prefs.excludedCategories, ['DevOps']);
      expect(prefs.keywords, ['ai', 'flutter']);
      expect(prefs.totalSwipes, 12);
      expect(prefs.averageRating, 4.2);
    });

    test('serializes category weights for backend preference updates', () {
      const prefs = PreferenceVector(
        likedCategories: [
          CategoryPreference(category: 'Machine Learning', weight: 0.85),
          CategoryPreference(category: 'DevOps', weight: 0),
        ],
        excludedCategories: ['DevOps'],
      );

      expect(prefs.toJson()['category_weights'], {
        'Machine Learning': 0.85,
        'DevOps': 0.0,
      });
      expect(prefs.toJson()['excluded_categories'], ['DevOps']);
    });

    test('available categories include core app categories', () {
      expect(
          PreferenceNotifier.availableCategories, contains('Machine Learning'));
      expect(PreferenceNotifier.availableCategories,
          contains('Mobile Development'));
      expect(PreferenceNotifier.availableCategories,
          contains('Software Engineering'));
    });
  });

  group('PreferenceNotifier category movement', () {
    test('markCategoryLiked sets a positive weight and removes exclusion',
        () async {
      Map<String, dynamic>? savedBody;
      final api = ApiService(
        baseUrl: 'http://localhost:3000',
        client: MockClient((request) async {
          if (request.method == 'GET') {
            return _preferencesResponse({
              'category_weights': {'DevOps': 0},
              'excluded_categories': ['DevOps'],
            });
          }

          savedBody = jsonDecode(request.body) as Map<String, dynamic>;
          return _preferencesResponse(savedBody!);
        }),
      );
      final notifier = PreferenceNotifier(api);
      await _flushAsync();

      await notifier.markCategoryLiked('DevOps');

      expect(savedBody?['excluded_categories'], isNot(contains('DevOps')));
      expect(savedBody?['category_weights']['DevOps'], 0.85);
    });

    test('markCategoryDisliked saves excluded category and zero weight',
        () async {
      Map<String, dynamic>? savedBody;
      final api = ApiService(
        baseUrl: 'http://localhost:3000',
        client: MockClient((request) async {
          if (request.method == 'GET') {
            return _preferencesResponse({
              'category_weights': {'Machine Learning': 0.85},
              'excluded_categories': <String>[],
            });
          }

          savedBody = jsonDecode(request.body) as Map<String, dynamic>;
          return _preferencesResponse(savedBody!);
        }),
      );
      final notifier = PreferenceNotifier(api);
      await _flushAsync();

      await notifier.markCategoryDisliked('Machine Learning');

      expect(savedBody?['excluded_categories'], contains('Machine Learning'));
      expect(savedBody?['category_weights']['Machine Learning'], 0.0);
    });

    test('clearCategoryPreference removes exclusion and zeroes the weight',
        () async {
      Map<String, dynamic>? savedBody;
      final api = ApiService(
        baseUrl: 'http://localhost:3000',
        client: MockClient((request) async {
          if (request.method == 'GET') {
            return _preferencesResponse({
              'category_weights': {'DevOps': 0},
              'excluded_categories': ['DevOps'],
            });
          }

          savedBody = jsonDecode(request.body) as Map<String, dynamic>;
          return _preferencesResponse(savedBody!);
        }),
      );
      final notifier = PreferenceNotifier(api);
      await _flushAsync();

      await notifier.clearCategoryPreference('DevOps');

      expect(savedBody?['excluded_categories'], isNot(contains('DevOps')));
      expect(savedBody?['category_weights']['DevOps'], 0.0);
    });
  });

  testWidgets('PreferencesScreen renders data from the API provider',
      (tester) async {
    SharedPreferences.setMockInitialValues({
      'grad_hub_preferences': jsonEncode({
        'category_weights': {
          'Machine Learning': 0.9,
          'Web Development': 0.7,
        },
        'excluded_categories': ['DevOps'],
        'keyword_weights': {'ai': 0.8},
        'total_swipes': 12,
        'average_rating': 4.2,
      }),
    });
    final api = ApiService(
      baseUrl: 'http://localhost:3000',
      client: MockClient((request) async {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'category_weights': {
                'Machine Learning': 0.9,
                'Web Development': 0.7,
              },
              'excluded_categories': ['DevOps'],
              'keyword_weights': {'ai': 0.8},
              'total_swipes': 12,
              'average_rating': 4.2,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiServiceProvider.overrideWithValue(api),
        ],
        child: const MaterialApp(home: PreferencesScreen()),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Preferences'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.text('Available Categories'), findsOneWidget);
    expect(find.text('Liked Categories'), findsOneWidget);
    expect(find.text('Disliked Categories'), findsOneWidget);
    expect(find.text('Machine Learning'), findsWidgets);
    expect(find.text('DevOps'), findsWidgets);
    expect(find.text('Like'), findsNothing);
    expect(find.text('Dislike'), findsNothing);
  });
}

http.Response _preferencesResponse(Map<String, dynamic> data) {
  return http.Response(
    jsonEncode({
      'success': true,
      'data': {
        'category_weights': data['category_weights'] ?? {},
        'excluded_categories': data['excluded_categories'] ?? [],
        'keyword_weights': data['keyword_weights'] ?? {},
        'total_swipes': data['total_swipes'] ?? 0,
        'average_rating': data['average_rating'] ?? 0,
      },
    }),
    200,
    headers: {'content-type': 'application/json'},
  );
}

Future<void> _flushAsync() async {
  await Future<void>.delayed(Duration.zero);
  await Future<void>.delayed(Duration.zero);
}
