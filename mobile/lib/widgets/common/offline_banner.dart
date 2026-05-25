import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../theme/app_theme.dart';

/// Offline network banner widget.
///
/// Monitors connectivity and shows a slide-down banner when offline:
///   - "You're offline — swipes saved locally"
///   - Auto-hides when connectivity is restored
///   - Sync status indicator when coming back online
///
/// Usage:
///   Place at the top of your main screen's widget tree:
///   ```dart
///   Column(
///     children: [
///       const OfflineBanner(),
///       Expanded(child: YourContent()),
///     ],
///   );
///   ```
class OfflineBanner extends StatefulWidget {
  /// Custom offline message.
  final String? offlineMessage;

  /// Custom online message shown briefly when reconnecting.
  final String? onlineMessage;

  const OfflineBanner({
    super.key,
    this.offlineMessage,
    this.onlineMessage,
  });

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner>
    with SingleTickerProviderStateMixin {
  final Connectivity _connectivity = Connectivity();
  late StreamSubscription<List<ConnectivityResult>> _subscription;

  bool _isOnline = true;
  bool _showSyncing = false;

  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

    // Listen to connectivity changes
    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      final online = !results.contains(ConnectivityResult.none);
      _onConnectivityChanged(online);
    });

    // Check initial connectivity
    _checkInitialConnectivity();
  }

  Future<void> _checkInitialConnectivity() async {
    try {
      final result = await _connectivity.checkConnectivity();
      if (mounted) {
        final online = !result.contains(ConnectivityResult.none);
        _isOnline = online;
        if (!online) _slideController.forward();
      }
    } catch (_) {
      // Assume online if check fails
      _isOnline = true;
    }
  }

  void _onConnectivityChanged(bool online) {
    if (!mounted) return;

    if (online && !_isOnline) {
      // Just came back online
      setState(() {
        _isOnline = true;
        _showSyncing = true;
      });

      // Show syncing briefly, then hide
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() => _showSyncing = false);
          _slideController.reverse();
        }
      });
    } else if (!online && _isOnline) {
      // Just went offline
      setState(() {
        _isOnline = false;
        _showSyncing = false;
      });
      _slideController.forward();
    }
  }

  @override
  void dispose() {
    _subscription.cancel();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isOnline && !_showSyncing) return const SizedBox.shrink();

    return SlideTransition(
      position: _slideAnimation,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: _showSyncing
              ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))
              : (isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7)),
        ),
        child: SafeArea(
          bottom: false,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon
              Icon(
                _showSyncing ? Icons.sync_rounded : Icons.wifi_off_rounded,
                size: 16,
                color: _showSyncing
                    ? (isDark ? AppColors.successDark : AppColors.successLight)
                    : (isDark ? AppColors.warning : AppColors.warning),
              ),
              const SizedBox(width: 8),

              // Message
              Expanded(
                child: Text(
                  _showSyncing
                      ? (widget.onlineMessage ?? 'Back online — syncing...')
                      : (widget.offlineMessage ??
                          "You're offline — swipes saved locally"),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _showSyncing
                        ? (isDark
                            ? const Color(0xFFA7F3D0)
                            : const Color(0xFF065F46))
                        : (isDark
                            ? const Color(0xFFFDE68A)
                            : const Color(0xFF92400E)),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),

              // Sync spinner when reconnecting
              if (_showSyncing)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        isDark ? AppColors.successDark : AppColors.successLight,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
