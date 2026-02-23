import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/zippy_card.dart';
import '../../shared/widgets/zippy_input.dart';

class IncomingRequestsPage extends StatelessWidget {
  IncomingRequestsPage({super.key});
  final offer = TextEditingController(text: '2500');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Solicitudes cercanas')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ZippyCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Origen: Av. Siempre Viva 123'),
                const Text('Destino: Terminal Central'),
                const SizedBox(height: 8),
                const Text('Distancia: 4.2km · Base: \$ 2.300'),
                const SizedBox(height: 12),
                ZippyInput(label: 'Tu oferta', controller: offer),
                const SizedBox(height: 12),
                FilledButton(onPressed: () => context.push('/driver/en-route'), child: const Text('Enviar oferta')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
