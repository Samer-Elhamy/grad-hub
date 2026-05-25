import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/swipe.dart';
import '../services/api_service.dart';
import '../providers/idea_provider.dart';

/// State for the history screen.
class HistoryScreenState {
  final List<SwipeRecord> records;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;
  final String activeFilter;
  final int currentPage;
  final bool hasMore;

  const HistoryScreenState({
    this.records = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.activeFilter = 'all',
    this.currentPage = 1,
    this.hasMore = true,
  });

  HistoryScreenState copyWith({
    List<SwipeRecord>? records,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    String? activeFilter,
    int? currentPage,
    bool? hasMore,
  }) {
    return HistoryScreenState(
      records: records ?? this.records,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: error,
      activeFilter: activeFilter ?? this.activeFilter,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

/// History screen: paginated list of swiped ideas with filter chips.
class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  HistoryScreenState _state = const HistoryScreenState();
  final ScrollController _scrollController = ScrollController();

  static const _filters = ['all', 'liked', 'disliked'];

  @override
  void initState() {
    super.initState();
    _loadHistory();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_state.isLoadingMore &&
        _state.hasMore) {
      _loadMore();
    }
  }

  String _getDirectionParam() {
    switch (_state.activeFilter) {
      case 'liked':
        return 'right';
      case 'disliked':
        return 'left';
      default:
        return '';
    }
  }

  Future<void> _loadHistory() async {
    setState(() => _state = _state.copyWith(isLoading: true, error: null));

    try {
      final api = ref.read(apiServiceProvider);
      final direction = _getDirectionParam();
      final response = await api.fetchHistory(
        page: 1,
        limit: 20,
        direction: direction.isNotEmpty ? direction : null,
      );

      setState(() => _state = _state.copyWith(
            records: response.items,
            isLoading: false,
            currentPage: 1,
            hasMore: response.hasMore,
          ));
    } catch (e) {
      setState(() => _state = _state.copyWith(
            isLoading: false,
            error: e.toString(),
          ));
    }
  }

  Future<void> _loadMore() async {
    if (_state.isLoadingMore || !_state.hasMore) return;
    setState(() => _state = _state.copyWith(isLoadingMore: true));

    try {
      final api = ref.read(apiServiceProvider);
      final direction = _getDirectionParam();
      final nextPage = _state.currentPage + 1;
      final response = await api.fetchHistory(
        page: nextPage,
        limit: 20,
        direction: direction.isNotEmpty ? direction : null,
      );

      setState(() => _state = _state.copyWith(
            records: [..._state.records, ...response.items],
            isLoadingMore: false,
            currentPage: nextPage,
            hasMore: response.hasMore,
          ));
    } catch (_) {
      setState(() => _state = _state.copyWith(isLoadingMore: false));
    }
  }

  Future<void> _onRefresh() async {
    setState(() => _state = _state.copyWith(currentPage: 1));
    await _loadHistory();
  }

  void _setFilter(String filter) {
    if (filter == _state.activeFilter) return;
    setState(() => _state = _state.copyWith(activeFilter: filter, currentPage: 1));
    _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Text('History', style: theme.textTheme.headlineMedium),
            ),

            // Filter chips
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Row(
                children: _filters.map((filter) {
                  final isActive = filter == _state.activeFilter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(filter[0].toUpperCase() + filter.substring(1)),
                      selected: isActive,
                      onSelected: (_) => _setFilter(filter),
                      selectedColor: theme.colorScheme.primary.withAlpha(38),
                      checkmarkColor: theme.colorScheme.primary,
                    ),
                  );
                }).toList(),
              ),
            ),

            // List or empty/loading state
            Expanded(child: _buildBody(theme)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_state.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text('Failed to load history', style: theme.textTheme.bodyLarge),
            const SizedBox(height: 8),
            ElevatedButton(onPressed: _loadHistory, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (_state.records.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: theme.textTheme.bodyMedium?.color?.withAlpha(77)),
            const SizedBox(height: 16),
            Text('No swipes yet', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('Start swiping to build your history.',
                style: theme.textTheme.bodyMedium),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _state.records.length + (_state.hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == _state.records.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            );
          }

          return _buildHistoryItem(_state.records[index], theme);
        },
      ),
    );
  }

  Widget _buildHistoryItem(SwipeRecord record, ThemeData theme) {
    final isLiked = record.direction == SwipeDirection.right;
    final isSuperlike = record.direction == SwipeDirection.up;
    final isDark = theme.brightness == Brightness.dark;

    IconData directionIcon;
    Color directionColor;
    String directionLabel;

    switch (record.direction) {
      case SwipeDirection.right:
        directionIcon = Icons.favorite_rounded;
        directionColor = const Color(0xFF10B981);
        directionLabel = 'Liked';
      case SwipeDirection.left:
        directionIcon = Icons.close_rounded;
        directionColor = const Color(0xFFEF4444);
        directionLabel = 'Disliked';
      case SwipeDirection.up:
        directionIcon = Icons.star_rounded;
        directionColor = const Color(0xFF8B5CF6);
        directionLabel = 'Super liked';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Direction indicator
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: directionColor.withAlpha(26),
              ),
              child: Icon(directionIcon, color: directionColor, size: 20),
            ),
            const SizedBox(width: 12),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Idea #${record.ideaId}',
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        directionLabel,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: directionColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (record.rating != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          'Rating: ${record.rating!.toStringAsFixed(1)}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            // Timestamp
            Text(
              _formatDate(record.timestamp),
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.month}/${date.day}';
  }
}
