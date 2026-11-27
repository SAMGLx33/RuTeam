import type { RouteGeometry, TripPoint } from '@ruteam/contracts';
import { distanceKm } from '../../trips/domain/models/driver-route.js';

type Point = Pick<TripPoint, 'latitude' | 'longitude'>;
const approachMeters = 100;

// Project on the published polyline, rejecting ambiguous crossings and inconsistent order.
export function segmentDistances(
  geometry: RouteGeometry | null,
  stops: Point[],
  total: number | null,
) {
  if (!total || total < 0 || stops.length < 2) return null;
  if (stops.length === 2) return [total];
  if (
    !geometry ||
    geometry.type !== 'LineString' ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  )
    return null;
  if (
    geometry.coordinates.some(
      (pair) => !Array.isArray(pair) || pair.length !== 2,
    )
  )
    return null;
  const points = geometry.coordinates.map(([longitude, latitude]) => ({
    longitude,
    latitude,
  }));
  if (
    points.some(
      ({ longitude, latitude }) =>
        !Number.isFinite(longitude) || !Number.isFinite(latitude),
    )
  )
    return null;
  const edges = points.slice(1).map((end, index) => ({
    start: points[index],
    end,
    meters: 1000 * distanceKm(points[index], end),
  }));
  const distance = edges.reduce((sum, edge) => sum + edge.meters, 0);
  if (
    !distance ||
    !Number.isFinite(distance) ||
    distanceKm(stops[0], points[0]) * 1000 > approachMeters ||
    distanceKm(stops.at(-1)!, points.at(-1)!) * 1000 > approachMeters
  )
    return null;
  const offsets = [0];
  for (const stop of stops.slice(1, -1)) {
    let prefix = 0;
    const candidates = [];
    for (const { start, end, meters } of edges) {
      const scale = Math.cos((stop.latitude * Math.PI) / 180);
      const east = (end.longitude - start.longitude) * scale;
      const north = end.latitude - start.latitude;
      const divisor = east ** 2 + north ** 2;
      if (divisor > 0) {
        const fraction = Math.min(
          1,
          Math.max(
            0,
            ((stop.longitude - start.longitude) * scale * east +
              (stop.latitude - start.latitude) * north) /
              divisor,
          ),
        );
        const error =
          distanceKm(stop, {
            latitude:
              start.latitude + fraction * (end.latitude - start.latitude),
            longitude:
              start.longitude + fraction * (end.longitude - start.longitude),
          }) * 1000;
        if (error <= approachMeters)
          candidates.push({ error, offset: prefix + fraction * meters });
      }
      prefix += meters;
    }
    candidates.sort((a, b) => a.error - b.error);
    const best = candidates[0];
    if (
      !best ||
      best.offset <= offsets.at(-1)! ||
      best.offset >= distance ||
      candidates.some(
        (other) =>
          other.error < best.error + 10 &&
          Math.abs(other.offset - best.offset) > approachMeters,
      )
    )
      return null;
    offsets.push(best.offset);
  }
  offsets.push(distance);
  return offsets
    .slice(1)
    .map((offset, index) => (total * (offset - offsets[index])) / distance);
}
