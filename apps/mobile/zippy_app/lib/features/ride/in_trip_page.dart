import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class InTripPage extends StatelessWidget {
  const InTripPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Viaje en curso')),
      body: Stack(
        children: [
          const GoogleMap(initialCameraPosition: CameraPosition(target: LatLng(-34.6037, -58.3816), zoom: 13)),
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Card(
              child: ListTile(
                title: const Text('Ruta monitoreada'),
                subtitle: const Text('Alertas de seguridad activas'),
                trailing: FilledButton(onPressed: () {}, child: const Text('SOS')),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
