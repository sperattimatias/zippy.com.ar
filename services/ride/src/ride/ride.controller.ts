import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../common/jwt-access.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { RideService } from './ride.service';
import {
  AcceptBidDto,
  CancelDto,
  CreateBidDto,
  LocationDto,
  PresenceOnlineDto,
  PresencePingDto,
  RateTripDto,
  TripRequestDto,
  VerifyOtpDto,
} from '../dto/ride.dto';

type AuthReq = { user: { sub: string; roles: string[] } };

@ApiTags('ride')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAccessGuard, RolesGuard)
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Post('drivers/presence/online')
  @Roles('driver')
  presenceOnline(@Req() req: AuthReq, @Body() dto: PresenceOnlineDto) { return this.rideService.presenceOnline(req.user.sub, dto); }

  @Post('drivers/presence/offline')
  @Roles('driver')
  presenceOffline(@Req() req: AuthReq) { return this.rideService.presenceOffline(req.user.sub); }

  @Post('drivers/presence/ping')
  @Roles('driver')
  presencePing(@Req() req: AuthReq, @Body() dto: PresencePingDto) { return this.rideService.presencePing(req.user.sub, dto); }

  @Post('trips/request')
  @Roles('passenger')
  requestTrip(@Req() req: AuthReq, @Body() dto: TripRequestDto) { return this.rideService.requestTrip(req.user.sub, dto); }

  @Post('trips/:id/bids')
  @Roles('driver')
  createBid(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: CreateBidDto) { return this.rideService.createBid(id, req.user.sub, dto); }

  @Post('trips/:id/accept-bid')
  @Roles('passenger')
  acceptBid(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: AcceptBidDto) { return this.rideService.acceptBid(id, req.user.sub, dto); }

  @Post('trips/:id/driver/en-route')
  @Roles('driver')
  driverEnRoute(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.driverEnRoute(id, req.user.sub); }

  @Post('trips/:id/driver/arrived')
  @Roles('driver')
  driverArrived(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.driverArrived(id, req.user.sub); }

  @Post('trips/:id/driver/verify-otp')
  @Roles('driver')
  verifyOtp(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: VerifyOtpDto) { return this.rideService.verifyOtp(id, req.user.sub, dto); }

  @Post('trips/:id/location')
  @Roles('driver')
  location(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: LocationDto) { return this.rideService.trackLocation(id, req.user.sub, dto); }

  @Post('trips/:id/complete')
  @Roles('driver')
  complete(@Req() req: AuthReq, @Param('id') id: string) { return this.rideService.completeTrip(id, req.user.sub); }

  @Post('trips/:id/rate')
  @Roles('passenger')
  rate(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: RateTripDto) { return this.rideService.rateTrip(id, req.user.sub, dto); }

  @Post('trips/:id/cancel')
  @Roles('passenger')
  cancelPassenger(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: CancelDto) { return this.rideService.cancelPassenger(id, req.user.sub, dto); }

  @Post('trips/:id/driver/cancel')
  @Roles('driver')
  cancelDriver(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: CancelDto) { return this.rideService.cancelDriver(id, req.user.sub, dto); }

  @Get('admin/trips')
  @Roles('admin', 'sos')
  adminTrips() { return this.rideService.listTripsRecent(); }

  @Get('admin/trips/:id')
  @Roles('admin', 'sos')
  adminTripDetail(@Param('id') id: string) { return this.rideService.tripDetail(id); }
}
