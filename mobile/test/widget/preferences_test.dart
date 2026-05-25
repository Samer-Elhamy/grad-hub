import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
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

    test('available categories include core app categories', () {
      expect(
          PreferenceNotifier.availableCategories, contains('Machine Learning'));
      expect(PreferenceNotifier.availableCategories,
          contains('Mobile Development'));
      expect(PreferenceNotifier.availableCategories,
          contains('Software Engineering'));
    });
  });

  testWidgets('PreferencesScreen renders data from the API provider',
      (tester) async {
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
    expect(find.text('Machine Learning'), findsWidgets);
    expect(find.text('DevOps'), findsWidgets);
  });
}
