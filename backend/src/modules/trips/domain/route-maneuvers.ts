import type { RouteManeuver } from '@ruteam/contracts';
import { z } from 'zod';

const kinds = z.enum([
  'DEPART',
  'ARRIVE',
  'TURN',
  'NEW_NAME',
  'MERGE',
  'RAMP',
  'ON_RAMP',
  'OFF_RAMP',
  'FORK',
  'END_OF_ROAD',
  'CONTINUE',
  'ROUNDABOUT',
  'ROTARY',
  'ROUNDABOUT_TURN',
  'EXIT_ROUNDABOUT',
  'EXIT_ROTARY',
  'OTHER',
]);
const modifiers = z.enum([
  'UTURN',
  'SHARP_RIGHT',
  'RIGHT',
  'SLIGHT_RIGHT',
  'STRAIGHT',
  'SLIGHT_LEFT',
  'LEFT',
  'SHARP_LEFT',
]);
const longitude = z.number().min(-180).max(180);
const latitude = z.number().min(-90).max(90);
const coordinate = z.tuple([longitude, latitude]);
const geometry = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(coordinate).min(2).max(500),
});
const distance = z.number().nonnegative().max(1_000_000);
const duration = z.number().nonnegative().max(21600);
const maxManeuvers = 150;
// El límite HTTP de publicación es de 32 KiB. Se reserva el resto a la ruta y paradas.
const maxBytes = 10 * 1024;

const maneuverSchema = z.object({
  order: z
    .number()
    .int()
    .min(0)
    .max(maxManeuvers - 1),
  leg: z.number().int().min(0).max(10),
  kind: kinds,
  modifier: modifiers.nullable(),
  street: z.string().min(1).max(120).nullable(),
  longitude,
  latitude,
  distanceMeters: distance,
  durationSeconds: duration,
  geometry,
  stopPosition: z.number().int().min(0).max(11).nullable(),
});

export const routeManeuversSchema = z
  .array(maneuverSchema)
  .min(1)
  .max(maxManeuvers)
  .refine((steps) => Buffer.byteLength(JSON.stringify(steps)) <= maxBytes);

const osrmStepSchema = z.object({
  distance,
  duration,
  name: z.string(),
  geometry,
  maneuver: z.object({
    location: coordinate,
    type: z.string(),
    modifier: z.string().optional(),
  }),
});

export function fromOsrmLegs(
  legs: readonly { steps?: unknown[] }[],
): RouteManeuver[] | undefined {
  const steps: RouteManeuver[] = [];
  for (const [leg, entry] of legs.entries()) {
    if (
      !entry.steps?.length ||
      steps.length + entry.steps.length > maxManeuvers
    )
      return undefined;
    for (const raw of entry.steps) {
      const parsed = osrmStepSchema.safeParse(raw);
      if (!parsed.success) return undefined;
      const step = parsed.data;
      const motor = step.maneuver;
      const kind = kinds.safeParse(
        motor.type.toUpperCase().replaceAll(' ', '_'),
      );
      const modifier = modifiers.safeParse(
        motor.modifier?.toUpperCase().replaceAll(' ', '_'),
      );
      steps.push({
        order: steps.length,
        leg,
        kind: kind.data ?? 'OTHER',
        modifier: modifier.data ?? null,
        street: step.name.trim().slice(0, 120) || null,
        longitude: motor.location[0],
        latitude: motor.location[1],
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        geometry: step.geometry,
        stopPosition:
          kind.data === 'ARRIVE'
            ? leg + 1
            : kind.data === 'DEPART'
              ? leg
              : null,
      });
    }
  }
  return routeManeuversSchema.safeParse(steps).data;
}
