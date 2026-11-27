import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ViajeController } from './controllers/trips.controller.js';
import { ViajeService } from './application/trips.service.js';
import { RoutingSelections } from './application/routing-selections.js';
import { ViajeRepository } from './infrastructure/repositories/trips.repository.js';
import { OsrmRoutingProvider } from './infrastructure/routing/osrm-routing.provider.js';
import { PickupProposalsController } from './controllers/pickup-proposals.controller.js';
import { PickupProposalsService } from './application/pickup-proposals.service.js';
import { PickupProposalsRepository } from './infrastructure/repositories/pickup-proposals.repository.js';
import { RecurringTripsController } from './controllers/recurring-trips.controller.js';
import { RecurringTripsService } from './application/recurring-trips.service.js';
import { RecurringTripsWorker } from './application/recurring-trips.worker.js';
import { RecurringTripsRepository } from './infrastructure/repositories/recurring-trips.repository.js';
@Module({
  imports: [AuthModule],
  controllers: [
    ViajeController,
    PickupProposalsController,
    RecurringTripsController,
  ],
  providers: [
    ViajeService,
    RecurringTripsService,
    RecurringTripsRepository,
    RecurringTripsWorker,
    RoutingSelections,
    ViajeRepository,
    OsrmRoutingProvider,
    PickupProposalsService,
    PickupProposalsRepository,
  ],
  exports: [ViajeRepository],
})
export class TripsModule {}
