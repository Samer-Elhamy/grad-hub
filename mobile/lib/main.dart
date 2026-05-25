import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';

/// Entry point for Grad Projects Hub v3 — Flutter Mobile App.
///
/// Wraps the app in a [ProviderScope] for Riverpod state management
/// and configures system UI overlays (status bar, nav bar).
void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Configure system UI for a clean, immersive look
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));

  runApp(
    const ProviderScope(
      child: GradHubApp(),
    ),
  );
}
