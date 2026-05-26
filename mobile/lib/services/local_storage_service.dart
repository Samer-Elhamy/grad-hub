import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/preference.dart';
import '../models/swipe.dart';

class LocalStorageService {
  static const _preferencesKey = 'grad_hub_preferences';
  static const _historyKey = 'grad_hub_swipe_history';

  Future<PreferenceVector> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_preferencesKey);
    if (raw == null || raw.isEmpty) return const PreferenceVector();
    return PreferenceVector.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<void> savePreferences(PreferenceVector preferences) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_preferencesKey, jsonEncode(preferences.toJson()));
  }

  Future<List<SwipeRecord>> loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_historyKey);
    if (raw == null || raw.isEmpty) return const [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list
        .map((item) => SwipeRecord.fromJson(item as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  }

  Future<void> saveSwipe(SwipeRecord record) async {
    final records = await loadHistory();
    final updated = [
      record,
      ...records.where((item) => item.ideaId != record.ideaId),
    ]..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _historyKey,
      jsonEncode(updated.map((item) => item.toJson()).toList()),
    );
  }

  Future<HistoryResponse> fetchHistory({
    int page = 1,
    int limit = 20,
    String? filter,
  }) async {
    final records = await loadHistory();
    final filtered = records.where((record) {
      if (filter == 'liked') return record.direction == SwipeDirection.right;
      if (filter == 'disliked') return record.direction == SwipeDirection.left;
      if (filter == 'starred') return record.direction == SwipeDirection.up;
      return true;
    }).toList();
    final start = (page - 1) * limit;
    final items = start >= filtered.length
        ? const <SwipeRecord>[]
        : filtered.skip(start).take(limit).toList();
    return HistoryResponse(
      items: items,
      page: page,
      limit: limit,
      total: filtered.length,
      hasMore: start + items.length < filtered.length,
    );
  }
}
