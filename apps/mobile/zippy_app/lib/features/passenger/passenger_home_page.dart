import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../shared/copy/messages_es_ar.dart';
import '../../shared/widgets/zippy_bottom_sheet_scaffold.dart';
import '../../shared/widgets/zippy_card.dart';
import '../../shared/widgets/zippy_empty_state.dart';
import '../../shared/widgets/zippy_primary_button.dart';

class PassengerHomePage extends StatefulWidget {
  const PassengerHomePage({super.key});

  @override
  State<PassengerHomePage> createState() => _PassengerHomePageState();
}

class _PassengerHomePageState extends State<PassengerHomePage> {
  final destination = TextEditingController();
  int onlineDrivers = 0;
  double offerRatio = 1.0;

  void _openDestinationSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (context, setModalState) => ZippyBottomSheetScaffold(
          title: 'Elegí destino',
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 240),
            switchInCurve: Curves.easeOutCubic,
            child: Column(
              key: ValueKey(offerRatio),
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: destination, decoration: const InputDecoration(prefixIcon: Icon(Icons.location_on_outlined), hintText: '¿A dónde vamos?')),
                const SizedBox(height: 12),
                const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Precio base'), Text('\$ 2.450')]),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.tune),
                    Expanded(
                      child: Slider(
                        min: 0.9,
                        max: 1.3,
                        divisions: 8,
                        value: offerRatio,
                        onChanged: (v) => setModalState(() => offerRatio = v),
                      ),
                    ),
                  ],
                ),
                ZippyPrimaryButton(
                  label: 'Solicitar viaje',
                  onPressed: () {
                    Navigator.pop(context);
                    this.context.push('/ride/waiting');
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const GoogleMap(initialCameraPosition: CameraPosition(target: LatLng(-34.6037, -58.3816), zoom: 12)),
          Positioned(
            top: 52,
            left: 16,
            right: 16,
            child: Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              elevation: 6,
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: _openDestinationSheet,
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  child: Row(children: [Icon(Icons.search), SizedBox(width: 8), Text('¿A dónde vamos?')]),
                ),
              ),
            ),
          ),
          if (onlineDrivers == 0)
            ZippyEmptyState(
              icon: Icons.local_taxi_outlined,
              title: MessagesEsAr.noDriversTitle,
              subtitle: MessagesEsAr.noDriversSubtitle,
              ctaLabel: 'Entrar a lista de espera',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Te avisamos cuando haya conductores'))),
            ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 20,
            child: ZippyCard(
              child: Row(
                children: [
                  Expanded(child: Text('Conductores online: $onlineDrivers')),
                  TextButton(onPressed: _openDestinationSheet, child: const Text('Solicitar')),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
