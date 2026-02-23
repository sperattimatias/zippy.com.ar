import 'package:flutter/material.dart';

import '../design/radius.dart';
import '../design/shadows.dart';

class ZippyCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;

  const ZippyCard({super.key, required this.child, this.padding = const EdgeInsets.all(16)});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(ZippyRadius.r20), boxShadow: ZippyShadows.soft),
      child: Padding(padding: padding, child: child),
    );
  }
}
