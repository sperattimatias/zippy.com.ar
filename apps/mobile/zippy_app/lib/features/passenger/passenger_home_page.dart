import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../shared/widgets/zippy_card.dart';

class PassengerHomePage extends StatelessWidget {
  const PassengerHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Modo Pasajero')),
      body: Stack(
        children: [
          const GoogleMap(initialCameraPosition: CameraPosition(target: LatLng(-34.6037, -58.3816), zoom: 12)),
          Positioned(
            left: 16,
            right: 16,
            top: 16,
            child: ZippyCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('¿A dónde vamos?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  const Text('Conductores online: 12'),
                  const SizedBox(height: 10),
                  FilledButton(onPressed: () => context.push('/passenger/destination'), child: const Text('Solicitar viaje')),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
