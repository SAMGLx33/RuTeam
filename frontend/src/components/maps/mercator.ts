import type { TripPoint } from '@ruteam/contracts';

export type Coordinates = Pick<TripPoint, 'latitude' | 'longitude'>;
export type WorldPoint = { x: number; y: number };
export type Camera = { center: WorldPoint; zoom: number };
export const tileSize = 256;
export const caliCenter: Coordinates = { latitude: 3.426, longitude: -76.532 };
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));
export function worldPoint(longitude: number, latitude: number): WorldPoint {
  const degrees = clamp(latitude, -85.05113, 85.05113);
  const sine = Math.sin((degrees * Math.PI) / 180);
  return {
    x: (180 + longitude) / 360,
    y: 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI),
  };
}
export function coordinatesFromWorld({ x, y }: WorldPoint): Coordinates {
  return {
    longitude: clamp(x, 0, 1) * 360 - 180,
    latitude:
      (Math.atan(Math.sinh(Math.PI * (1 - 2 * clamp(y, 0, 1)))) * 180) /
      Math.PI,
  };
}

export function fitCamera(
  points: WorldPoint[],
  fallback: Coordinates,
  width: number,
  height: number,
): Camera {
  const fallbackCenter = worldPoint(fallback.longitude, fallback.latitude);
  if (!points.length) return { center: fallbackCenter, zoom: 13 };
  if (points.length === 1) return { center: points[0], zoom: 15 };
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const west = Math.min(...xs),
    east = Math.max(...xs),
    north = Math.min(...ys),
    south = Math.max(...ys);
  const fit = Math.min(
    Math.max(1, width - 88) / Math.max(east - west, Number.EPSILON),
    Math.max(1, height - 96) / Math.max(south - north, Number.EPSILON),
  );
  return {
    center: { x: (west + east) / 2, y: (north + south) / 2 },
    zoom: clamp(Math.floor(Math.log2(fit / tileSize)), 3, 17),
  };
}
