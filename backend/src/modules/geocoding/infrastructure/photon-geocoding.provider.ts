import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import type { GeocodedPlace, PlaceSearchResponse } from '@ruteam/contracts';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';

const limit = 6;
const maxResponseBytes = 256 * 1024;
const collection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(z.unknown()).max(50),
});
const feature = z.object({
  type: z.literal('Feature'),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
  }),
  properties: z.object({
    name: z.string().optional(),
    street: z.string().optional(),
    housenumber: z.string().optional(),
    district: z.string().optional(),
    locality: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    countrycode: z.string().optional(),
  }),
});

function normalize(value: string | undefined): string {
  return (value ?? '').replace(/\s+/gu, ' ').trim();
}

function result(value: unknown): GeocodedPlace | undefined {
  const parsed = feature.safeParse(value);
  if (!parsed.success) return undefined;
  const { properties, geometry } = parsed.data;
  if (properties.countrycode && properties.countrycode.toUpperCase() !== 'CO')
    return undefined;
  const street = [properties.street, properties.housenumber]
    .map(normalize)
    .filter(Boolean)
    .join(' ');
  const label = (normalize(properties.name) || street).slice(0, 100);
  if (label.length < 2) return undefined;
  const context = [
    ...new Set(
      [
        street,
        properties.district,
        properties.locality,
        properties.city,
        properties.state,
      ]
        .map(normalize)
        .filter((part) => part && part !== label),
    ),
  ]
    .join(' · ')
    .slice(0, 180);
  const [longitude, latitude] = geometry.coordinates;
  return { label, context, longitude, latitude };
}

async function readJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Respuesta vacía');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let payload = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxResponseBytes)
        throw new Error('Respuesta demasiado grande');
      payload += decoder.decode(value, { stream: true });
    }
    return JSON.parse(payload + decoder.decode()) as unknown;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

@Injectable()
export class PhotonGeocodingProvider {
  constructor(@Inject(ENVIRONMENT) private readonly config: Environment) {}

  async search(
    query: string,
    cancellation?: AbortSignal,
  ): Promise<PlaceSearchResponse> {
    if (!this.config.GEOCODING_BASE_URL)
      throw new ServiceUnavailableException(
        'La búsqueda de lugares todavía no está configurada.',
      );
    const url = new URL(
      `${this.config.GEOCODING_BASE_URL.replace(/\/$/, '')}/api`,
    );
    url.search = new URLSearchParams({
      q: query,
      countrycode: 'CO',
      lat: '3.4516',
      lon: '-76.5320',
      limit: String(limit),
    }).toString();
    const timeout = AbortSignal.timeout(4000);
    const signal = cancellation
      ? AbortSignal.any([timeout, cancellation])
      : timeout;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es-CO,es;q=0.9',
          'User-Agent': 'RuTeam/1.0',
        },
        signal,
        redirect: 'error',
      });
    } catch {
      throw new BadGatewayException(
        'No pudimos consultar lugares en este momento.',
      );
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 429 || response.status >= 500)
        throw new ServiceUnavailableException(
          'El proveedor de lugares no está disponible en este momento.',
        );
      throw new BadGatewayException(
        'El proveedor de lugares devolvió una respuesta inesperada.',
      );
    }
    let payload: unknown;
    try {
      payload = await readJson(response);
    } catch {
      throw new BadGatewayException(
        'El proveedor de lugares devolvió una respuesta inesperada.',
      );
    }
    const parsed = collection.safeParse(payload);
    if (!parsed.success)
      throw new BadGatewayException(
        'El proveedor de lugares devolvió una respuesta inesperada.',
      );

    const seen = new Set<string>();
    const items: GeocodedPlace[] = [];
    for (const value of parsed.data.features) {
      const place = result(value);
      if (!place) continue;
      const key = `${place.label.toLocaleLowerCase('es-CO')}|${place.latitude.toFixed(6)}|${place.longitude.toFixed(6)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(place);
      if (items.length === limit) break;
    }
    if (parsed.data.features.length && !items.length)
      throw new BadGatewayException(
        'El proveedor de lugares no devolvió resultados válidos.',
      );
    return { items, attribution: 'Datos © OpenStreetMap contributors' };
  }
}
