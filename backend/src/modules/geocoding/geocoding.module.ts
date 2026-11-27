import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GeocodingService } from './application/geocoding.service.js';
import { GeocodingController } from './controllers/geocoding.controller.js';
import { PhotonGeocodingProvider } from './infrastructure/photon-geocoding.provider.js';

@Module({
  imports: [AuthModule],
  controllers: [GeocodingController],
  providers: [GeocodingService, PhotonGeocodingProvider],
})
export class GeocodingModule {}
