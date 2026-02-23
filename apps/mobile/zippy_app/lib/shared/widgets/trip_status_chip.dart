import 'package:flutter/material.dart';

class TripStatusChip extends StatelessWidget {
  final String status;
  const TripStatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 230),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(status, style: const TextStyle(fontWeight: FontWeight.w600)),
    );
  }
}
