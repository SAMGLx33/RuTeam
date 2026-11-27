import { Injectable } from '@nestjs/common';
import { PhotonGeocodingProvider } from '../infrastructure/photon-geocoding.provider.js';

@Injectable()
export class GeocodingService {
  constructor(private readonly provider: PhotonGeocodingProvider) {}

  search(query: string, cancellation: AbortSignal) {
    return this.provider.search(query, cancellation);
  }
}
