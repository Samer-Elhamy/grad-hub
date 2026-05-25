import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/main_feed_screen.dart';
import '../screens/history_screen.dart';
import '../screens/preferences_screen.dart';
import '../theme/app_theme.dart';

/// Route path constants for the app.
class AppRoutes {
  AppRoutes._();

  static const feed = '/feed';
  static const history = '/history';
  static const preferences = '/preferences';
}

/// Builds the GoRouter configuration with ShellRoute for bottom navigation.
///
/// Routes:
///   /feed (default) — Main card stack feed
///   /history — Swipe history with filters
///   /preferences — Category preference toggles
class AppRouter {
  AppRouter._();

  static final GoRouter router = GoRouter(
    initialLocation: AppRoutes.feed,
    routes: [
      ShellRoute(
        builder: (context, state, child) => _ShellScaffold(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.feed,
            name: 'feed',
            builder: (context, state) => const MainFeedScreen(),
          ),
          GoRoute(
            path: AppRoutes.history,
            name: 'history',
            builder: (context, state) => const HistoryScreen(),
          ),
          GoRoute(
            path: AppRoutes.preferences,
            name: 'preferences',
            builder: (context, state) => const PreferencesScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => _NotFoundScreen(error: state.error),
  );
}

/// Scaffold with bottom navigation that wraps all main routes.
class _ShellScaffold extends StatelessWidget {
  final Widget child;

  const _ShellScaffold({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNavBar(key: UniqueKey()),
    );
  }
}

/// Bottom navigation bar with three tabs.
class _BottomNavBar extends StatelessWidget {
  _BottomNavBar({super.key});

  /// Map of route → tab index.
  static const _routes = <int, String>{
    0: AppRoutes.feed,
    1: AppRoutes.history,
    2: AppRoutes.preferences,
  };

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    for (final entry in _routes.entries) {
      if (location.startsWith(entry.value)) return entry.key;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(context);

    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (index) {
        final route = _routes[index]!;
        if (route != GoRouterState.of(context).uri.toString()) {
          context.go(route);
        }
      },
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.explore_outlined),
          activeIcon: Icon(Icons.explore),
          label: 'Discover',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.history_outlined),
          activeIcon: Icon(Icons.history),
          label: 'History',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.tune_outlined),
          activeIcon: Icon(Icons.tune),
          label: 'Preferences',
        ),
      ],
    );
  }
}

/// Fallback screen for unknown routes.
class _NotFoundScreen extends StatelessWidget {
  final Exception? error;

  const _NotFoundScreen({this.error});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.map_outlined,
                size: 64,
                color: theme.textTheme.bodyMedium?.color?.withAlpha(128),
              ),
              const SizedBox(height: 16),
              Text(
                'Page not found',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                error?.toString() ?? 'The requested page does not exist.',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.go(AppRoutes.feed),
                child: const Text('Go to Discover'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
