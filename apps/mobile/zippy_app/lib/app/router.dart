import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_repository.dart';
import '../core/realtime/socket_service.dart';
import '../core/storage/secure_storage_service.dart';
import '../features/auth/login_page.dart';
import '../features/auth/register_page.dart';
import '../features/auth/splash_page.dart';
import '../features/driver/driver_en_route_page.dart';
import '../features/driver/driver_home_page.dart';
import '../features/driver/driver_otp_page.dart';
import '../features/driver/incoming_requests_page.dart';
import '../features/passenger/destination_sheet_page.dart';
import '../features/passenger/passenger_home_page.dart';
import '../features/payments/earnings_page.dart';
import '../features/profile/role_selector_page.dart';
import '../features/ride/in_trip_page.dart';
import '../features/ride/waiting_page.dart';

GoRouter buildRouter({
  required AuthRepository authRepository,
  required SocketService socketService,
  required SecureStorageService storage,
}) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(path: '/splash', builder: (c, s) => SplashPage(storage: storage)),
      GoRoute(
        path: '/login',
        builder: (c, s) => LoginPage(authRepository: authRepository, socketService: socketService, storage: storage),
      ),
      GoRoute(path: '/register', builder: (c, s) => RegisterPage()),
      GoRoute(
        path: '/role-selector',
        builder: (context, state) => RoleSelectorPage(roles: (state.extra as List<String>?) ?? const ['passenger']),
      ),
      GoRoute(path: '/passenger/home', builder: (c, s) => const PassengerHomePage()),
      GoRoute(path: '/passenger/destination', builder: (c, s) => DestinationSheetPage()),
      GoRoute(path: '/ride/waiting', builder: (c, s) => const WaitingPage()),
      GoRoute(path: '/ride/en-route', builder: (c, s) => const WaitingPage()),
      GoRoute(path: '/ride/in-trip', builder: (c, s) => const InTripPage()),
      GoRoute(path: '/driver/home', builder: (c, s) => const DriverHomePage()),
      GoRoute(path: '/driver/requests', builder: (c, s) => IncomingRequestsPage()),
      GoRoute(path: '/driver/en-route', builder: (c, s) => const DriverEnRoutePage()),
      GoRoute(path: '/driver/otp', builder: (c, s) => DriverOtpPage()),
      GoRoute(path: '/driver/earnings', builder: (c, s) => const EarningsPage()),
    ],
    errorBuilder: (context, state) => Scaffold(body: Center(child: Text(state.error.toString()))),
  );
}
