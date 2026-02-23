import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../shared/widgets/trip_status_chip.dart';

class InTripPage extends StatefulWidget {
  const InTripPage({super.key});

  @override
  State<InTripPage> createState() => _InTripPageState();
}

class _InTripPageState extends State<InTripPage> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 240));
  late Animation<double> _lat;
  late Animation<double> _lng;
  LatLng current = const LatLng(-34.6037, -58.3816);
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _lat = AlwaysStoppedAnimation(current.latitude);
    _lng = AlwaysStoppedAnimation(current.longitude);
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _nextPoint());
  }

  void _nextPoint() {
    final target = LatLng(current.latitude + 0.0007, current.longitude + 0.0005);
    _lat = Tween<double>(begin: current.latitude, end: target.latitude).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _lng = Tween<double>(begin: current.longitude, end: target.longitude).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller
      ..reset()
      ..forward().whenComplete(() => setState(() => current = target));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Viaje en curso')),
      body: AnimatedBuilder(
        animation: _controller,
        builder: (_, __) {
          final pos = LatLng(_lat.value, _lng.value);
          return Stack(
            children: [
              GoogleMap(
                initialCameraPosition: CameraPosition(target: pos, zoom: 14),
                myLocationButtonEnabled: false,
                markers: {
                  Marker(
                    markerId: const MarkerId('driver'),
                    position: pos,
                    infoWindow: const InfoWindow(title: 'Conductor'),
                  ),
                },
              ),
              const Positioned(top: 16, left: 16, child: TripStatusChip(status: 'IN_TRIP')),
              Positioned(
                bottom: 16,
                left: 16,
                right: 16,
                child: Card(
                  child: ListTile(
                    title: const Text('Ruta monitoreada'),
                    subtitle: const Text('Movimiento del conductor suavizado en tiempo real'),
                    trailing: FilledButton(onPressed: () {}, child: const Text('Centrar')),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
