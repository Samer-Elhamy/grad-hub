import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grad_hub_mobile/models/swipe.dart';
import 'package:grad_hub_mobile/providers/idea_provider.dart';
import 'package:grad_hub_mobile/providers/swipe_provider.dart';
import 'package:grad_hub_mobile/services/api_service.dart';
import 'package:grad_hub_mobile/services/websocket_service.dart';

void main() {
  test('idea stack shows local fallback ideas when API is unavailable',
      () async {
    final api = ApiService(
      baseUrl: 'http://localhost:3000',
      client: MockClient((_) async => http.Response('offline', 500)),
    );
    final ws = WebSocketService(wsUrl: 'ws://localhost:3000/ws/stream');
    final notifier = IdeaStackNotifier(api, ws);

    addTearDown(() {
      notifier.dispose();
      api.dispose();
      ws.dispose();
    });

    await Future<void>.delayed(const Duration(milliseconds: 50));

    final ideas = notifier.state.when(
      data: (value) => value,
      loading: () => const [],
      error: (_, __) => const [],
    );
    expect(ideas, isNotEmpty);
    expect(ideas.first.title, isNotEmpty);
  });

  test('swipe removes the current card even when backend recording fails',
      () async {
    var requestedIdea = false;
    final api = ApiService(
      baseUrl: 'http://localhost:3000',
      client: MockClient((request) async {
        if (request.url.path == '/api/ideas/next') {
          if (requestedIdea) return http.Response('offline', 500);
          requestedIdea = true;
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 101,
                'title': 'Offline test idea',
                'description': 'A local card should still be swipable.',
                'category': 'Software Engineering',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path == '/api/swipe') {
          return http.Response('offline', 500);
        }
        return http.Response('offline', 500);
      }),
    );
    final ws = WebSocketService(wsUrl: 'ws://localhost:3000/ws/stream');
    final ideaStack = IdeaStackNotifier(api, ws);

    addTearDown(() {
      ideaStack.dispose();
      api.dispose();
      ws.dispose();
    });

    await Future<void>.delayed(const Duration(milliseconds: 50));
    final idea = ideaStack.currentIdea!;
    final swipe = SwipeNotifier(api, ideaStack);

    final result = await swipe.recordSwipe(
      idea: idea,
      direction: SwipeDirection.right,
    );

    expect(result, isTrue);
    expect(ideaStack.currentIdea?.id, isNot(idea.id));
  });
}
