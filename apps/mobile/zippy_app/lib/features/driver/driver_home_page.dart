import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../shared/widgets/zippy_card.dart';

class DriverHomePage extends StatefulWidget {
  const DriverHomePage({super.key});

  @override
  State<DriverHomePage> createState() => _DriverHomePageState();
}

class _DriverHomePageState extends State<DriverHomePage> {
  bool online = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Modo Conductor')),
      body: Stack(
        children: [
          const GoogleMap(initialCameraPosition: CameraPosition(target: LatLng(-34.6037, -58.3816), zoom: 12)),
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: ZippyCard(
              child: Row(
                children: [
                  const Expanded(child: Text('Estado de presencia')),
                  Switch(value: online, onChanged: (v) => setState(() => online = v)),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: FilledButton(onPressed: () => context.push('/driver/requests'), child: const Text('Ver solicitudes')),
          ),
        ],
      ),
    );
  }
}
