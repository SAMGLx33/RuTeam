import type { RouteManeuver } from '@ruteam/contracts';

interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface NavigationFix extends Coordinate {
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

type Position = RouteManeuver['geometry']['coordinates'][number];
type Segment = {
  from: Position;
  longitudeDelta: number;
  latitudeDelta: number;
  startMeters: number;
  lengthMeters: number;
  startSeconds: number;
  durationSeconds: number;
};
type Guidance = {
  maneuver: RouteManeuver;
  atMeters: number;
  atSeconds: number;
};

type Navigation = {
  segments: Segment[];
  guidance: Guidance[];
  totalMeters: number;
};

export type NavigationEstimate =
  | { status: 'STALE' | 'IMPRECISE' | 'OFF_ROUTE' | 'AMBIGUOUS' }
  | {
      status: 'ON_ROUTE';
      meters: number;
      percent: number;
      timestamp: number;
      projected: Coordinate;
      remainingMeters: number;
      next: { maneuver: RouteManeuver; remainingMeters: number } | null;
      arrival: { position: number; remainingSeconds: number } | null;
    };
type OnRoute = Extract<NavigationEstimate, { status: 'ON_ROUTE' }>;
const metersPerDegree = 111195;
const radians = Math.PI / 180;

function lengthBetween([x1, y1]: Position, [x2, y2]: Position) {
  return (
    metersPerDegree *
    Math.hypot((x2 - x1) * Math.cos(((y1 + y2) / 2) * radians), y2 - y1)
  );
}

export function prepareNavigation(
  maneuvers: readonly RouteManeuver[],
): Navigation {
  const segments: Segment[] = [];
  const guidance: Guidance[] = [];
  let totalMeters = 0;
  let totalSeconds = 0;
  for (const maneuver of maneuvers) {
    guidance.push({
      maneuver,
      atMeters: totalMeters,
      atSeconds: totalSeconds,
    });
    const points = maneuver.geometry.coordinates;
    const lengths = points
      .slice(1)
      .map((to, index) => lengthBetween(points[index], to));
    const segmentSum = lengths.reduce((sum, length) => sum + length, 0);
    let startMeters = totalMeters;
    let startSeconds = totalSeconds;
    for (const [index, length] of lengths.entries()) {
      if (!length || !maneuver.distanceMeters) continue;
      const from = points[index];
      const to = points[index + 1];
      const lengthMeters = (length * maneuver.distanceMeters) / segmentSum;
      const durationSeconds = (length * maneuver.durationSeconds) / segmentSum;
      segments.push({
        from,
        longitudeDelta: to[0] - from[0],
        latitudeDelta: to[1] - from[1],
        startMeters,
        lengthMeters,
        startSeconds,
        durationSeconds,
      });
      startMeters += lengthMeters;
      startSeconds += durationSeconds;
    }
    totalMeters += maneuver.distanceMeters;
    totalSeconds += maneuver.durationSeconds;
  }
  return { guidance, segments, totalMeters };
}

function project(segment: Segment, fix: NavigationFix) {
  const scale = Math.cos(fix.latitude * radians);
  const dx = segment.longitudeDelta * scale;
  const dy = segment.latitudeDelta;
  const x = (fix.longitude - segment.from[0]) * scale;
  const y = fix.latitude - segment.from[1];
  const fraction = Math.max(
    0,
    Math.min(1, (x * dx + y * dy) / (dx * dx + dy * dy)),
  );
  return {
    meters: segment.startMeters + segment.lengthMeters * fraction,
    seconds: segment.startSeconds + segment.durationSeconds * fraction,
    projected: {
      longitude: segment.from[0] + segment.longitudeDelta * fraction,
      latitude: segment.from[1] + segment.latitudeDelta * fraction,
    },
    distance:
      Math.hypot(x - dx * fraction, y - dy * fraction) * metersPerDegree,
    heading: (Math.atan2(dx, dy) / radians + 360) % 360,
  };
}

export function estimateRouteProgress(
  navigation: Navigation,
  fix: NavigationFix,
  prior: OnRoute | null,
  now: number,
): NavigationEstimate {
  if (now - fix.timestamp > 30000 || fix.timestamp - now > 15000)
    return { status: 'STALE' };
  const { accuracy, heading, speed } = fix;
  if (accuracy === null || accuracy > 65) return { status: 'IMPRECISE' };

  const searchRadius = Math.min(80, Math.max(25, accuracy * 1.4));
  const nearby = navigation.segments
    .map((segment) => project(segment, fix))
    .filter(({ distance }) => distance <= searchRadius);
  if (!nearby.length) return { status: 'OFF_ROUTE' };

  const gap = prior ? (fix.timestamp - prior.timestamp) / 1000 : null;
  const useContinuity = prior && gap !== null && gap > 0 && gap < 45;
  const useHeading =
    heading !== null &&
    heading >= 0 &&
    heading <= 360 &&
    speed !== null &&
    speed >= 2;
  const candidates = nearby
    .filter((point) => {
      if (useContinuity && gap !== null) {
        const advance = point.meters - prior.meters;
        if (
          advance < -Math.max(50, accuracy * 2) ||
          advance > gap * 35 + accuracy * 2
        )
          return false;
      }
      if (useHeading && heading !== null)
        return Math.abs(((point.heading - heading + 540) % 360) - 180) <= 65;
      return true;
    })
    .sort((a, b) => a.distance - b.distance);
  const best = candidates[0];
  if (
    !best ||
    candidates.some(
      (point) =>
        point.distance - best.distance <= Math.max(8, accuracy / 2) &&
        Math.abs(point.meters - best.meters) > Math.max(50, accuracy * 2),
    )
  )
    return { status: 'AMBIGUOUS' };

  const next = navigation.guidance.find(
    ({ atMeters, maneuver }) =>
      maneuver.kind !== 'DEPART' && atMeters >= best.meters - 5,
  );
  const arrival = navigation.guidance.find(
    ({ atMeters, maneuver }) =>
      maneuver.kind === 'ARRIVE' && atMeters > best.meters + accuracy,
  );
  const remainingSeconds = arrival
    ? Math.ceil(arrival.atSeconds - best.seconds)
    : 0;
  return {
    status: 'ON_ROUTE',
    meters: best.meters,
    percent: Math.round((best.meters / navigation.totalMeters) * 100),
    timestamp: fix.timestamp,
    projected: best.projected,
    remainingMeters: Math.max(
      0,
      Math.round(navigation.totalMeters - best.meters),
    ),
    next: next
      ? {
          maneuver: next.maneuver,
          remainingMeters: Math.max(0, Math.round(next.atMeters - best.meters)),
        }
      : null,
    arrival:
      arrival?.maneuver.stopPosition != null && remainingSeconds > 0
        ? { position: arrival.maneuver.stopPosition, remainingSeconds }
        : null,
  };
}
