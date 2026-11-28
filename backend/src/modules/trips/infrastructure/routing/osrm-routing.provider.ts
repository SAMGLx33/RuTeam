import {
  BadGatewayException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import type { RouteOption, TripPoint } from '@ruteam/contracts';
import { DomainPolicyError } from '../../../../common/errors/domain-policy.error.js';
import {
  ENVIRONMENT,
  type Environment,
} from '../../../../config/environment.js';
import { fromOsrmLegs } from '../../domain/route-maneuvers.js';
import { validateGeometry } from '../../domain/models/driver-route.js';

const responseSchema = z.object({
  code: z.string(),
  routes: z.array(z.unknown()).max(3).optional(),
});
const routeSchema = z.object({
  distance: z.number().positive(),
  duration: z.number().positive(),
  legs: z
    .array(
      z.object({
        duration: z.number().nonnegative().max(21600),
        steps: z.array(z.unknown()).optional(),
      }),
    )
    .max(11)
    .optional(),
  geometry: z.object({
    type: z.literal('LineString'),
    coordinates: z
      .array(z.tuple([z.number(), z.number()]))
      .min(2)
      .max(500),
  }),
});

@Injectable()
export class OsrmRoutingProvider {
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {}

  async options(points: readonly TripPoint[]): Promise<RouteOption[]> {
    if (!this.env.ROUTING_BASE_URL)
      throw new ServiceUnavailableException(
        'Motor vial sin configurar. Puedes publicar el itinerario descrito y los puntos ordenados.',
      );
    const coordinates = points
      .map(
        ({ longitude, latitude }) =>
          `${longitude.toFixed(6)},${latitude.toFixed(6)}`,
      )
      .join(';');
    const base = this.env.ROUTING_BASE_URL.replace(/\/$/, '');
    const query =
      'alternatives=2&steps=true&overview=simplified&geometries=geojson&generate_hints=false';
    let payload: unknown;
    try {
      const response = await fetch(
        `${base}/route/v1/driving/${coordinates}?${query}`,
        {
          headers: { 'User-Agent': 'RuTeam/0.1' },
          redirect: 'error',
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.status !== 400 && !response.ok)
        throw new Error('Estado inesperado de OSRM');
      payload = await response.json();
    } catch {
      throw new BadGatewayException(
        'El motor vial no respondió. Conserva tu recorrido actual o publica el itinerario descrito.',
      );
    }
    const result = responseSchema.safeParse(payload);
    if (
      !result.success ||
      !['Ok', 'NoRoute', 'NoSegment'].includes(result.data.code)
    )
      throw new BadGatewayException(
        'El motor vial devolvió una respuesta inesperada.',
      );
    const options: RouteOption[] = [];
    if (result.data.code === 'Ok') {
      for (const item of result.data.routes ?? []) {
        const parsed = routeSchema.safeParse(item);
        if (!parsed.success) continue;
        try {
          validateGeometry(parsed.data.geometry, points);
          const legs = parsed.data.legs?.map(({ duration }) =>
            Math.round(duration),
          );
          const seconds = legs?.reduce((total, leg) => total + leg, 0) ?? 0;
          const reliable =
            legs?.length === points.length - 1 &&
            seconds > 0 &&
            seconds <= 21600 &&
            Math.abs(seconds - parsed.data.duration) <= points.length;
          const maneuvers =
            reliable && parsed.data.legs
              ? fromOsrmLegs(parsed.data.legs)
              : undefined;
          options.push({
            geometry: parsed.data.geometry,
            distanceMeters: Math.round(parsed.data.distance),
            durationMinutes: reliable
              ? Math.max(5, Math.ceil(seconds / 60))
              : Math.max(1, Math.round(parsed.data.duration / 60)),
            ...(reliable && { legDurationsSeconds: legs }),
            ...(maneuvers && { maneuvers }),
          });
        } catch (error) {
          if (!(error instanceof DomainPolicyError)) throw error;
        }
      }
    }
    if (!options.length)
      throw new UnprocessableEntityException(
        'El motor vial no encontró una geometría compatible con los puntos.',
      );
    return options;
  }
}
