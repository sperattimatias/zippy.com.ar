import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/badge_chip.dart';
import '../../shared/widgets/zippy_card.dart';

class WaitingPage extends StatelessWidget {
  const WaitingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buscando conductor')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Ofertas en tiempo real'),
          const SizedBox(height: 12),
          ZippyCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [Text('Laura M.'), SizedBox(width: 8), BadgeChip('Confiable')]),
                const SizedBox(height: 8),
                const Text('Oferta: \$ 2.650 · ETA 5 min'),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: FilledButton(onPressed: () => context.push('/ride/en-route'), child: const Text('Aceptar'))),
                    const SizedBox(width: 8),
                    Expanded(child: OutlinedButton(onPressed: () => context.pop(), child: const Text('Cancelar'))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
