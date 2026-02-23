import 'package:flutter/material.dart';

import 'zippy_primary_button.dart';

class ZippyEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String ctaLabel;
  final VoidCallback? onTap;

  const ZippyEmptyState({super.key, required this.icon, required this.title, required this.subtitle, required this.ctaLabel, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 42),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ZippyPrimaryButton(label: ctaLabel, onPressed: onTap),
          ],
        ),
      ),
    );
  }
}
