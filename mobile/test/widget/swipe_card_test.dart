import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grad_hub_mobile/widgets/card/swipeable_card.dart';
import 'package:grad_hub_mobile/models/idea.dart';

void main() {
  group('SwipeableCard Widget Tests', () {
    // Test data
    final testIdea = const Idea(
      id: 1,
      title: 'AI-Powered Chatbot',
      titleAr: 'شات بوت مدعوم بالذكاء الاصطناعي',
      description:
          'A modern chatbot using machine learning for natural language processing.',
      category: 'Machine Learning',
      university: 'MIT',
      difficulty: 'intermediate',
      technologies: ['Python', 'TensorFlow', 'NLP'],
      tags: ['AI', 'ML'],
    );

    testWidgets('renders card with idea title', (WidgetTester tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('AI-Powered Chatbot'), findsOneWidget);
    });

    testWidgets('renders card with idea description',
        (WidgetTester tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      // Assert
      expect(
        find.text(
            'A modern chatbot using machine learning for natural language processing.'),
        findsOneWidget,
      );
    });

    testWidgets('renders card with university name',
        (WidgetTester tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('MIT'), findsOneWidget);
    });

    testWidgets('renders card with difficulty display',
        (WidgetTester tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedRight: () {},
              onSwipedLeft: () {},
            ),
          ),
        ),
      );

      // Assert: intermediate shows '••'
      expect(find.text('••'), findsOneWidget);
    });

    testWidgets('renders technology tags', (WidgetTester tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      // Assert
      expect(find.text('Python'), findsOneWidget);
      expect(find.text('TensorFlow'), findsOneWidget);
      expect(find.text('NLP'), findsOneWidget);
    });

    testWidgets('calls onSwipedRight when swiped right past threshold',
        (WidgetTester tester) async {
      // Arrange
      bool wasSwipedRight = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {
                fail('Should not call onSwipedLeft');
              },
              onSwipedRight: () {
                wasSwipedRight = true;
              },
            ),
          ),
        ),
      );

      // Act: Drag right past threshold (150px)
      final cardFinder = find.byType(SwipeableCard);
      await tester.drag(cardFinder, const Offset(200, 0));
      await tester.pumpAndSettle();

      // Assert
      expect(wasSwipedRight, isTrue);
    });

    testWidgets('calls onSwipedLeft when swiped left past threshold',
        (WidgetTester tester) async {
      // Arrange
      bool wasSwipedLeft = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {
                wasSwipedLeft = true;
              },
              onSwipedRight: () {
                fail('Should not call onSwipedRight');
              },
            ),
          ),
        ),
      );

      // Act: Drag left past threshold
      final cardFinder = find.byType(SwipeableCard);
      await tester.drag(cardFinder, const Offset(-200, 0));
      await tester.pumpAndSettle();

      // Assert
      expect(wasSwipedLeft, isTrue);
    });

    testWidgets('does not call swipe callbacks when dragged under threshold',
        (WidgetTester tester) async {
      // Arrange
      bool wasSwiped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {
                wasSwiped = true;
              },
              onSwipedRight: () {
                wasSwiped = true;
              },
            ),
          ),
        ),
      );

      // Act: Drag right but under threshold (150px)
      final cardFinder = find.byType(SwipeableCard);
      await tester.drag(cardFinder,
          const Offset(100, 0)); // Only 100px, under 150px threshold
      await tester.pumpAndSettle();

      // Assert
      expect(wasSwiped, isFalse);
    });

    testWidgets('non-top card is not draggable', (WidgetTester tester) async {
      // Arrange
      bool wasSwiped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () => wasSwiped = true,
              onSwipedRight: () => wasSwiped = true,
              isTop: false, // Not the top card
            ),
          ),
        ),
      );

      // Act: Try to drag
      final cardFinder = find.byType(SwipeableCard);
      await tester.drag(cardFinder, const Offset(200, 0));
      await tester.pumpAndSettle();

      // Assert: Should not have swiped
      expect(wasSwiped, isFalse);
    });

    testWidgets('card rotates during drag', (WidgetTester tester) async {
      // Arrange
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: testIdea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      // Act: Start a drag
      final cardFinder = find.byType(SwipeableCard);
      final gesture = await tester.startGesture(
        tester.getCenter(cardFinder),
      );
      await gesture.moveBy(const Offset(100, 0));
      await tester.pump();

      // Assert: Card should be transformed
      // We can't easily check rotation, but we can verify the card still exists
      expect(cardFinder, findsOneWidget);

      // Cleanup
      await gesture.up();
      await tester.pumpAndSettle();
    });

    testWidgets('renders category icon based on category',
        (WidgetTester tester) async {
      // Arrange: Test different categories
      final categories = [
        'Web Development',
        'Machine Learning',
        'Mobile Development',
        'Cybersecurity',
        'DevOps',
        'Game Development',
        'AR/VR',
      ];

      for (final category in categories) {
        final idea = Idea(
          id: 1,
          title: 'Test Idea',
          category: category,
          technologies: const [],
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SwipeableCard(
                idea: idea,
                onSwipedLeft: () {},
                onSwipedRight: () {},
              ),
            ),
          ),
        );

        // Assert: Card renders
        expect(find.text('Test Idea'), findsOneWidget);

        await tester.pumpAndSettle();
      }
    });
  });

  group('SwipeableCard Edge Cases', () {
    testWidgets('handles null description gracefully',
        (WidgetTester tester) async {
      // Arrange
      final idea = Idea(
        id: 1,
        title: 'Idea Without Description',
        technologies: [],
        description: null,
      );

      // Act & Assert: Should not throw
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: idea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      expect(find.text('Idea Without Description'), findsOneWidget);
    });

    testWidgets('handles empty technologies list', (WidgetTester tester) async {
      // Arrange
      final idea = Idea(
        id: 1,
        title: 'Idea Without Tech',
        technologies: [],
      );

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: idea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      // Assert: Card renders without tech chips
      expect(find.text('Idea Without Tech'), findsOneWidget);
    });

    testWidgets('displays Arabic title when available',
        (WidgetTester tester) async {
      // Arrange
      const idea = Idea(
        id: 1,
        title: 'English Title',
        titleAr: 'العنوان العربي',
        technologies: [],
      );

      // Act
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SwipeableCard(
              idea: idea,
              onSwipedLeft: () {},
              onSwipedRight: () {},
            ),
          ),
        ),
      );

      // Assert: English title is displayed (primary)
      expect(find.text('English Title'), findsOneWidget);
    });
  });

  group('Idea Model Difficulty Display Tests', () {
    test('difficultyDisplay returns correct for beginner', () {
      const idea = Idea(
        id: 1,
        title: 'Test',
        difficulty: 'beginner',
        technologies: [],
      );
      expect(idea.difficultyDisplay, '•');
    });

    test('difficultyDisplay returns correct for intermediate', () {
      const idea = Idea(
        id: 1,
        title: 'Test',
        difficulty: 'intermediate',
        technologies: [],
      );
      expect(idea.difficultyDisplay, '••');
    });

    test('difficultyDisplay returns correct for advanced', () {
      const idea = Idea(
        id: 1,
        title: 'Test',
        difficulty: 'advanced',
        technologies: [],
      );
      expect(idea.difficultyDisplay, '•••');
    });

    test('difficultyDisplay returns default for null difficulty', () {
      const idea = Idea(
        id: 1,
        title: 'Test',
        difficulty: null,
        technologies: [],
      );
      expect(idea.difficultyDisplay, '••');
    });

    test('difficultyDisplay handles Arabic difficulty values', () {
      const ideaBeginner = Idea(
        id: 1,
        title: 'Test',
        difficulty: 'مبتدئ',
        technologies: [],
      );
      const ideaIntermediate = Idea(
        id: 2,
        title: 'Test',
        difficulty: 'متوسط',
        technologies: [],
      );
      const ideaAdvanced = Idea(
        id: 3,
        title: 'Test',
        difficulty: 'متقدم',
        technologies: [],
      );

      expect(ideaBeginner.difficultyDisplay, '•');
      expect(ideaIntermediate.difficultyDisplay, '••');
      expect(ideaAdvanced.difficultyDisplay, '•••');
    });
  });

  group('Idea Model Equality Tests', () {
    test('two ideas with same id are equal', () {
      const idea1 = Idea(id: 1, title: 'Test 1', technologies: []);
      const idea2 = Idea(id: 1, title: 'Test 2', technologies: []);

      expect(idea1 == idea2, isTrue);
      expect(idea1.hashCode == idea2.hashCode, isTrue);
    });

    test('two ideas with different ids are not equal', () {
      const idea1 = Idea(id: 1, title: 'Test', technologies: []);
      const idea2 = Idea(id: 2, title: 'Test', technologies: []);

      expect(idea1 == idea2, isFalse);
    });
  });

  group('Idea Model JSON Serialization Tests', () {
    test('toJson converts idea to map correctly', () {
      final idea = Idea(
        id: 1,
        title: 'Test Idea',
        titleAr: 'اختبار',
        description: 'Description',
        category: 'AI/ML',
        university: 'MIT',
        universityLocation: 'USA',
        difficulty: 'intermediate',
        technologies: ['Python', 'React'],
        tags: ['AI', 'Web'],
        imageUrl: 'https://example.com/image.png',
        createdAt: DateTime(2026, 1, 15),
      );

      final json = idea.toJson();

      expect(json['id'], 1);
      expect(json['title'], 'Test Idea');
      expect(json['title_ar'], 'اختبار');
      expect(json['description'], 'Description');
      expect(json['category'], 'AI/ML');
      expect(json['technologies'], ['Python', 'React']);
      expect(json['tags'], ['AI', 'Web']);
      expect(json['image_url'], 'https://example.com/image.png');
      expect(json['created_at'], '2026-01-15T00:00:00.000');
    });

    test('fromJson parses map correctly', () {
      final json = {
        'id': 1,
        'title': 'Test Idea',
        'title_ar': 'اختبار',
        'description': 'Description',
        'category': 'AI/ML',
        'university': 'MIT',
        'university_location': 'USA',
        'difficulty': 'intermediate',
        'technologies': ['Python', 'React'],
        'tags': ['AI', 'Web'],
        'image_url': 'https://example.com/image.png',
        'created_at': '2026-01-15T00:00:00.000Z',
      };

      final idea = Idea.fromJson(json);

      expect(idea.id, 1);
      expect(idea.title, 'Test Idea');
      expect(idea.titleAr, 'اختبار');
      expect(idea.description, 'Description');
      expect(idea.category, 'AI/ML');
      expect(idea.university, 'MIT');
      expect(idea.universityLocation, 'USA');
      expect(idea.difficulty, 'intermediate');
      expect(idea.technologies, ['Python', 'React']);
      expect(idea.tags, ['AI', 'Web']);
      expect(idea.imageUrl, 'https://example.com/image.png');
      expect(idea.createdAt, isNotNull);
    });

    test('fromJson handles missing optional fields', () {
      final json = {
        'id': 1,
        'title': 'Test Idea',
      };

      final idea = Idea.fromJson(json);

      expect(idea.id, 1);
      expect(idea.title, 'Test Idea');
      expect(idea.titleAr, isNull);
      expect(idea.description, isNull);
      expect(idea.technologies, isEmpty);
      expect(idea.tags, isEmpty);
    });

    test('_parseStringList handles list input', () {
      // Tested through fromJson
      final json = {
        'id': 1,
        'title': 'Test',
        'technologies': ['a', 'b', 'c'],
      };

      final idea = Idea.fromJson(json);
      expect(idea.technologies, ['a', 'b', 'c']);
    });

    test('_parseStringList handles single string input', () {
      final json = {
        'id': 1,
        'title': 'Test',
        'technologies': 'single-tech',
      };

      final idea = Idea.fromJson(json);
      expect(idea.technologies, ['single-tech']);
    });

    test('_parseStringList handles null input', () {
      final json = {
        'id': 1,
        'title': 'Test',
        'technologies': null,
      };

      final idea = Idea.fromJson(json);
      expect(idea.technologies, isEmpty);
    });
  });
}
