import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grad_hub_mobile/models/preference.dart';
import 'package:grad_hub_mobile/providers/preference_provider.dart';
import 'package:grad_hub_mobile/screens/preferences_screen.dart';

void main() {
  group('Preference Model Tests', () {
    test('CategoryPreference fromJson parses correctly', () {
      final json = {'category': 'AI/ML', 'weight': 0.8};
      final pref = CategoryPreference.fromJson(json);

      expect(pref.category, 'AI/ML');
      expect(pref.weight, 0.8);
    });

    test('CategoryPreference toJson serializes correctly', () {
      const pref = CategoryPreference(category: 'Web Dev', weight: 0.6);
      final json = pref.toJson();

      expect(json['category'], 'Web Dev');
      expect(json['weight'], 0.6);
    });

    test('CategoryPreference equality by category name', () {
      const pref1 = CategoryPreference(category: 'AI/ML', weight: 0.8);
      const pref2 = CategoryPreference(category: 'AI/ML', weight: 0.5);
      const pref3 = CategoryPreference(category: 'Web Dev', weight: 0.8);

      expect(pref1 == pref2, isTrue); // Same category = equal
      expect(pref1 == pref3, isFalse); // Different category = not equal
      expect(pref1.hashCode == pref2.hashCode, isTrue);
    });

    test('PreferenceVector fromJson parses nested data response', () {
      // API response format: { success: true, data: { ... } }
      final json = {
        'success': true,
        'data': {
          'liked_categories': [
            {'category': 'AI/ML', 'weight': 0.9},
            {'category': 'Web Dev', 'weight': 0.7},
          ],
          'excluded_categories': ['Embedded Systems', 'IoT'],
          'keywords': ['python', 'react', 'tensorflow'],
          'total_swipes': 42,
          'average_rating': 4.2,
        },
      };

      final prefs = PreferenceVector.fromJson(json);

      expect(prefs.likedCategories.length, 2);
      expect(prefs.likedCategories[0].category, 'AI/ML');
      expect(prefs.likedCategories[0].weight, 0.9);
      expect(prefs.excludedCategories, ['Embedded Systems', 'IoT']);
      expect(prefs.keywords, ['python', 'react', 'tensorflow']);
      expect(prefs.totalSwipes, 42);
      expect(prefs.averageRating, 4.2);
    });

    test('PreferenceVector fromJson parses direct format', () {
      // Direct format without 'data' wrapper
      final json = {
        'liked_categories': [
          {'category': 'Mobile', 'weight': 0.5},
        ],
        'excluded_categories': ['Hardware'],
      };

      final prefs = PreferenceVector.fromJson(json);

      expect(prefs.likedCategories.length, 1);
      expect(prefs.excludedCategories, ['Hardware']);
    });

    test('PreferenceVector fromJson handles missing optional fields', () {
      final json = <String, dynamic>{};

      final prefs = PreferenceVector.fromJson(json);

      expect(prefs.likedCategories, isEmpty);
      expect(prefs.excludedCategories, isEmpty);
      expect(prefs.keywords, isEmpty);
      expect(prefs.totalSwipes, 0);
      expect(prefs.averageRating, 0);
    });

    test('PreferenceVector toJson serializes correctly', () {
      final prefs = PreferenceVector(
        likedCategories: const [
          CategoryPreference(category: 'AI/ML', weight: 0.9),
          CategoryPreference(category: 'Web Dev', weight: 0.7),
        ],
        excludedCategories: const ['Embedded'],
        keywords: const ['python'],
      );

      final json = prefs.toJson();

      expect(json['liked_categories'], isList);
      expect(json['liked_categories'].length, 2);
      expect(json['excluded_categories'], ['Embedded']);
      expect(json['keywords'], ['python']);
    });

    test('isCategoryLiked returns true for liked categories', () {
      final prefs = PreferenceVector(
        likedCategories: const [
          CategoryPreference(category: 'AI/ML', weight: 0.9),
        ],
      );

      expect(prefs.isCategoryLiked('AI/ML'), isTrue);
      expect(prefs.isCategoryLiked('Web Dev'), isFalse);
    });

    test('isCategoryExcluded returns true for excluded categories', () {
      final prefs = PreferenceVector(
        excludedCategories: const ['Embedded', 'IoT'],
      );

      expect(prefs.isCategoryExcluded('Embedded'), isTrue);
      expect(prefs.isCategoryExcluded('IoT'), isTrue);
      expect(prefs.isCategoryExcluded('AI/ML'), isFalse);
    });

    test('allLikedCategoryNames returns list of category names', () {
      final prefs = PreferenceVector(
        likedCategories: const [
          CategoryPreference(category: 'AI/ML', weight: 0.9),
          CategoryPreference(category: 'Web Dev', weight: 0.7),
          CategoryPreference(category: 'Mobile', weight: 0.5),
        ],
      );

      expect(prefs.allLikedCategoryNames, ['AI/ML', 'Web Dev', 'Mobile']);
    });
  });

  group('Preferences Screen Widget Tests', () {
    testWidgets('shows loading indicator while loading',
        (WidgetTester tester) async {
      // Create a provider that always returns loading state
      final loadingPrefProvider = FutureProvider<PreferenceVector>((ref) async {
        await Future.delayed(const Duration(seconds: 1));
        return const PreferenceVector();
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider
                .overrideWith((ref) => ref.watch(loadingPrefProvider)),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      // Immediately after pump, should show loading
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('displays Preferences title', (WidgetTester tester) async {
      // Create a mock provider with data
      final mockPrefs = PreferenceVector(
        likedCategories: const [
          CategoryPreference(category: 'AI/ML', weight: 0.9),
        ],
        totalSwipes: 10,
        averageRating: 4.5,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) async => mockPrefs),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      // Wait for async loading
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Preferences'), findsOneWidget);
    });

    testWidgets('displays stats summary when data loaded',
        (WidgetTester tester) async {
      final mockPrefs = PreferenceVector(
        likedCategories: const [
          CategoryPreference(category: 'AI/ML', weight: 0.9),
          CategoryPreference(category: 'Web Dev', weight: 0.7),
        ],
        totalSwipes: 42,
        averageRating: 4.5,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) async => mockPrefs),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Stats should be visible
      expect(find.text('42'), findsOneWidget); // Total swipes
      expect(find.text('2'), findsOneWidget); // Liked cats count
      expect(find.text('4.5'), findsOneWidget); // Avg rating
    });

    testWidgets('shows empty hint when no liked categories',
        (WidgetTester tester) async {
      final mockPrefs = PreferenceVector(
        likedCategories: const [],
        totalSwipes: 0,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) async => mockPrefs),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('No liked'), findsOneWidget);
    });

    testWidgets('shows excluded categories section',
        (WidgetTester tester) async {
      final mockPrefs = PreferenceVector(
        excludedCategories: const ['Embedded Systems', 'IoT Hardware'],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) async => mockPrefs),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Excluded Categories'), findsOneWidget);
    });

    testWidgets('shows empty hint when no excluded categories',
        (WidgetTester tester) async {
      final mockPrefs = PreferenceVector(
        excludedCategories: const [],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) async => mockPrefs),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No excluded categories.'), findsOneWidget);
    });

    testWidgets('displays All Categories section', (WidgetTester tester) async {
      final mockPrefs = const PreferenceVector();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) async => mockPrefs),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('All Categories'), findsOneWidget);
    });

    testWidgets('shows Reset to defaults button', (WidgetTester tester) async {
      final mockPrefs = const PreferenceVector();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) async => mockPrefs),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Reset to defaults'), findsOneWidget);
    });

    testWidgets('shows error state on failure and allows retry',
        (WidgetTester tester) async {
      // Create a provider that throws
      final errorProvider = FutureProvider<PreferenceVector>((ref) async {
        throw Exception('Network error');
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            preferenceProvider.overrideWith((ref) => ref.watch(errorProvider)),
          ],
          child: const MaterialApp(
            home: PreferencesScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Error UI should be shown
      expect(find.text('Could not load preferences'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });

  group('Preference Provider Tests', () {
    test('availableCategories contains expected categories', () {
      // Access static available categories
      expect(PreferenceNotifier.availableCategories, isNotEmpty);
      expect(PreferenceNotifier.availableCategories.length, greaterThan(5));
    });

    test('availableCategories includes common CS categories', () {
      final categories = PreferenceNotifier.availableCategories;

      // Check for common categories
      expect(categories.any((c) => c.toLowerCase().contains('web')), isTrue);
      expect(
          categories.any((c) =>
              c.toLowerCase().contains('ai') ||
              c.toLowerCase().contains('machine')),
          isTrue);
      expect(categories.any((c) => c.toLowerCase().contains('mobile')), isTrue);
      expect(
          categories.any((c) => c.toLowerCase().contains('security')), isTrue);
    });
  });

  group('Preference Vector Edge Cases', () {
    test('default constructor has empty values', () {
      const prefs = PreferenceVector();

      expect(prefs.likedCategories, isEmpty);
      expect(prefs.excludedCategories, isEmpty);
      expect(prefs.keywords, isEmpty);
      expect(prefs.totalSwipes, 0);
      expect(prefs.averageRating, 0);
    });

    test('fromJson handles num to double conversion for weight', () {
      final json = {
        'liked_categories': [
          {'category': 'Test', 'weight': 1}, // int, not double
        ],
      };

      final prefs = PreferenceVector.fromJson(json);

      expect(prefs.likedCategories[0].weight, 1.0);
      expect(prefs.likedCategories[0].weight, isA<double>());
    });

    test('fromJson handles null weight gracefully', () {
      final json = {
        'liked_categories': [
          {'category': 'Test', 'weight': null},
        ],
      };

      final prefs = PreferenceVector.fromJson(json);

      expect(prefs.likedCategories[0].weight, 0);
    });

    test('isCategoryLiked is case-sensitive', () {
      final prefs = PreferenceVector(
        likedCategories: const [
          CategoryPreference(category: 'AI/ML', weight: 0.9),
        ],
      );

      expect(prefs.isCategoryLiked('ai/ml'), isFalse); // Different case
      expect(prefs.isCategoryLiked('AI/ML'), isTrue); // Exact match
    });

    test('isCategoryExcluded is case-sensitive', () {
      final prefs = PreferenceVector(
        excludedCategories: const ['Embedded'],
      );

      expect(prefs.isCategoryExcluded('embedded'), isFalse);
      expect(prefs.isCategoryExcluded('Embedded'), isTrue);
    });
  });
}
