import 'package:flutter/material.dart';

import '../shared/design/colors.dart';
import '../shared/design/radius.dart';
import '../shared/design/typography.dart';

class ZippyTheme {
  static ThemeData light() {
    final base = ThemeData(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: ZippyColors.bg,
      colorScheme: ColorScheme.fromSeed(
        seedColor: ZippyColors.brand,
        primary: ZippyColors.brand,
        secondary: ZippyColors.accent,
        surface: ZippyColors.surface,
      ),
      textTheme: base.textTheme.copyWith(
        headlineMedium: ZippyTypography.title.copyWith(color: ZippyColors.textPrimary),
        titleMedium: ZippyTypography.subtitle.copyWith(color: ZippyColors.textPrimary),
        bodyMedium: ZippyTypography.body.copyWith(color: ZippyColors.textPrimary),
        bodySmall: ZippyTypography.caption.copyWith(color: ZippyColors.textSecondary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(ZippyRadius.r16), borderSide: BorderSide.none),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(ZippyRadius.r24))),
        showDragHandle: true,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ZippyRadius.r16)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? ZippyColors.brand : Colors.white),
      ),
    );
  }
}
