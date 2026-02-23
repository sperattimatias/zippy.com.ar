# Zippy Flutter Android MVP

Aplicación Android Flutter para Passenger + Driver con realtime Socket.IO y mapas.

## Setup
1. Instalar Flutter 3.22+.
2. Ir a la carpeta:
   ```bash
   cd apps/mobile/zippy_app
   ```
3. Instalar dependencias:
   ```bash
   flutter pub get
   ```
4. Ejecutar en Android:
   ```bash
   flutter run --dart-define=API_BASE_URL=https://api.zippy.com.ar --dart-define=SOCKET_BASE_URL=https://api.zippy.com.ar
   ```

## Flows implementados
- Auth: splash, login, registro pasajero.
- Role switch: pasajero/conductor.
- Passenger: home map, destino, waiting bids, in-trip.
- Driver: home online/offline, incoming requests, en route, OTP, earnings.
- Realtime base: Socket service con join rooms y listeners.

## End-to-end manual
1. Login con cuenta passenger y pedir viaje.
2. Abrir sesión driver y poner Online.
3. Enviar oferta, aceptar desde passenger.
4. Driver marca llegado + OTP + iniciar/finalizar viaje.
