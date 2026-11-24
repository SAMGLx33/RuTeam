import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { ReservationsModule } from './modules/reservations/reservations.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ProfilesModule } from './modules/profiles/profiles.module.js';
import { CampusModule } from './modules/campus/campus.module.js';
import { InfrastructureModule } from './infrastructure/infrastructure.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { ClientOriginGuard } from './common/guards/client-origin.guard.js';
@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    VehiclesModule,
    TripsModule,
    ReservationsModule,
    ProfilesModule,
    CampusModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ClientOriginGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
