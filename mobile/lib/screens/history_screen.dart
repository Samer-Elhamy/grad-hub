import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../i18n.dart';
import '../models/swipe.dart';
import '../providers/idea_provider.dart';
import '../providers/language_provider.dart';

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

  static const _filters = ['all', 'starred', 'liked', 'disliked'];

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

  String _getFilterParam() {
    switch (_state.activeFilter) {
      case 'starred':
        return 'starred';
      case 'liked':
        return 'liked';
      case 'disliked':
        return 'disliked';
      default:
        return '';
    }
  }

  Future<void> _loadHistory() async {
    setState(() => _state = _state.copyWith(isLoading: true, error: null));

    try {
      final api = ref.read(apiServiceProvider);
      final filter = _getFilterParam();
      final response = await api.fetchHistory(
        page: 1,
        limit: 20,
        filter: filter.isNotEmpty ? filter : null,
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
      final filter = _getFilterParam();
      final nextPage = _state.currentPage + 1;
      final response = await api.fetchHistory(
        page: nextPage,
        limit: 20,
        filter: filter.isNotEmpty ? filter : null,
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
    setState(
        () => _state = _state.copyWith(activeFilter: filter, currentPage: 1));
    _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final language = ref.watch(languageProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Text(tr(language, 'history'),
                  style: theme.textTheme.headlineMedium),
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
                      label: Text(_filterLabel(language, filter)),
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
    final language = ref.watch(languageProvider);
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
            Text(tr(language, 'failedToLoadHistory'),
                style: theme.textTheme.bodyLarge),
            const SizedBox(height: 8),
            ElevatedButton(
                onPressed: _loadHistory, child: Text(tr(language, 'retry'))),
          ],
        ),
      );
    }

    if (_state.records.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history,
                size: 64,
                color: theme.textTheme.bodyMedium?.color?.withAlpha(77)),
            const SizedBox(height: 16),
            Text(tr(language, 'noSwipesYet'),
                style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(tr(language, 'startSwiping'),
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
    final isDark = theme.brightness == Brightness.dark;
    final idea = record.idea;
    final language = ref.watch(languageProvider);

    IconData directionIcon;
    Color directionColor;
    String directionLabel;

    switch (record.direction) {
      case SwipeDirection.right:
        directionIcon = Icons.favorite_rounded;
        directionColor = const Color(0xFF10B981);
        directionLabel = tr(language, 'liked');
      case SwipeDirection.left:
        directionIcon = Icons.close_rounded;
        directionColor = const Color(0xFFEF4444);
        directionLabel = tr(language, 'disliked');
      case SwipeDirection.up:
        directionIcon = Icons.star_rounded;
        directionColor = const Color(0xFF8B5CF6);
        directionLabel = tr(language, 'superLiked');
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: idea == null ? null : () => _showIdeaDetails(record),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              if (idea?.imageUrl != null) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(
                    idea!.imageUrl!,
                    width: 72,
                    height: 72,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 72,
                      height: 72,
                      color: isDark
                          ? const Color(0xFF21262D)
                          : const Color(0xFFE5E7EB),
                      child: const Icon(Icons.image_not_supported_outlined),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
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
                      idea?.displayTitle(arabic: language.isArabic) ??
                          tr(language, 'ideaDetailsUnavailable'),
                      style: theme.textTheme.titleSmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (idea
                            ?.displayDescription(arabic: language.isArabic)
                            .isNotEmpty ==
                        true) ...[
                      const SizedBox(height: 4),
                      Text(
                        idea!.displayDescription(arabic: language.isArabic),
                        style: theme.textTheme.bodySmall,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          directionLabel,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: directionColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (idea?.category != null) ...[
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              idea!.category!,
                              style: theme.textTheme.bodySmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
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
      ),
    );
  }

  String _filterLabel(AppLanguage language, String filter) {
    switch (filter) {
      case 'starred':
        return tr(language, 'starred');
      case 'liked':
        return tr(language, 'liked');
      case 'disliked':
        return tr(language, 'disliked');
      default:
        return tr(language, 'all');
    }
  }

  void _showIdeaDetails(SwipeRecord record) {
    final idea = record.idea;
    if (idea == null) return;
    final language = ref.read(languageProvider);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) {
        final theme = Theme.of(context);
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.75,
          maxChildSize: 0.92,
          builder: (context, controller) => ListView(
            controller: controller,
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
            children: [
              if (idea.imageUrl != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    idea.imageUrl!,
                    height: 190,
                    fit: BoxFit.cover,
                  ),
                ),
              const SizedBox(height: 16),
              Text(idea.displayTitle(arabic: language.isArabic),
                  style: theme.textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(idea.displayDescription(arabic: language.isArabic),
                  style: theme.textTheme.bodyMedium),
              if (idea.university != null || idea.country != null) ...[
                const SizedBox(height: 12),
                Text(
                  [idea.university, idea.country]
                      .whereType<String>()
                      .join(' · '),
                  style: theme.textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: idea.technologies
                    .map((tech) => Chip(label: Text(tech)))
                    .toList(),
              ),
              if (idea.sourceUrl != null) ...[
                const SizedBox(height: 16),
                SelectableText(
                  '${tr(language, 'moreDetails')}: ${idea.sourceUrl}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        );
      },
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
