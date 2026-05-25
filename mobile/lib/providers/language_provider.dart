import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppLanguage {
  en,
  ar;

  bool get isArabic => this == AppLanguage.ar;
}

class LanguageNotifier extends StateNotifier<AppLanguage> {
  LanguageNotifier() : super(AppLanguage.en);

  void toggle() {
    state = state == AppLanguage.en ? AppLanguage.ar : AppLanguage.en;
  }
}

final languageProvider =
    StateNotifierProvider<LanguageNotifier, AppLanguage>((ref) {
  return LanguageNotifier();
});
