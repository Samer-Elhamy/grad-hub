import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grad_hub_mobile/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('app startup renders the Discover feed with a visible card',
      (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      const ProviderScope(
        child: GradHubApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Discover'), findsWidgets);
    expect(find.text('AI Study Planner'), findsOneWidget);
    expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);
  });
}
