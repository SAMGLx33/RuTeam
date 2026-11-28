import { Inject, Injectable } from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { RouteGeometry, RouteOption, TripPoint } from '@ruteam/contracts';
import { routeManeuversSchema } from '../domain/route-maneuvers.js';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { DomainPolicyError } from '../../../common/errors/domain-policy.error.js';

const ttlSeconds = 30 * 60;
type SelectedRoute = {
  until: number;
  scope: string;
  legs: number[];
  distance: number;
  minutes: number;
  guidance?: string;
};

function maneuversScope(value: ReturnType<typeof routeManeuversSchema.parse>) {
  return createHash('sha256').update(JSON.stringify(value)).digest('base64url');
}

function routeScope(
  actorId: string,
  stops: readonly TripPoint[],
  geometry: RouteGeometry,
) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        actorId,
        stops.map(({ latitude, longitude }) => [
          latitude.toFixed(6),
          longitude.toFixed(6),
        ]),
        geometry.coordinates,
      ]),
    )
    .digest('base64url');
}

@Injectable()
export class RoutingSelections {
  private readonly secret: string | Buffer;
  constructor(@Inject(ENVIRONMENT) env: Environment) {
    this.secret = env.ROUTING_SELECTION_SECRET ?? randomBytes(32);
  }

  offer(
    actorId: string,
    stops: readonly TripPoint[],
    route: RouteOption,
    now = Date.now(),
  ): RouteOption {
    const legs = route.legDurationsSeconds;
    if (!legs) return route;
    const guidance = routeManeuversSchema.safeParse(route.maneuvers).data;
    const selection: SelectedRoute = {
      until: Math.floor(now / 1000) + ttlSeconds,
      scope: routeScope(actorId, stops, route.geometry),
      legs,
      distance: route.distanceMeters,
      minutes: route.durationMinutes,
      ...(guidance && { guidance: maneuversScope(guidance) }),
    };
    const body = Buffer.from(JSON.stringify(selection)).toString('base64url');
    return { ...route, routingSelection: `${body}.${this.signature(body)}` };
  }

  verify(
    token: string,
    actorId: string,
    stops: readonly TripPoint[],
    geometry: RouteGeometry | undefined,
    durationMinutes: number,
    now = Date.now(),
    maneuvers?: unknown,
  ): SelectedRoute & {
    maneuvers?: ReturnType<typeof routeManeuversSchema.parse>;
  } {
    const failure =
      'La alternativa vial expiró o cambió. Consulta y selecciona la ruta nuevamente.';
    const parts = token.split('.');
    if (
      parts.length !== 2 ||
      !geometry ||
      !/^[\w-]{1,480}$/.test(parts[0]) ||
      !/^[\w-]{43}$/.test(parts[1])
    )
      throw new DomainPolicyError(failure);
    const [body, supplied] = parts;
    if (
      !timingSafeEqual(Buffer.from(this.signature(body)), Buffer.from(supplied))
    )
      throw new DomainPolicyError(failure);
    const choice: SelectedRoute = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    );
    if (
      choice.until <= Math.floor(now / 1000) ||
      choice.scope !== routeScope(actorId, stops, geometry) ||
      choice.minutes !== durationMinutes ||
      choice.legs.length !== stops.length - 1
    )
      throw new DomainPolicyError(failure);
    if (maneuvers !== undefined) {
      const material = routeManeuversSchema.safeParse(maneuvers);
      if (
        !material.success ||
        choice.guidance !== maneuversScope(material.data)
      )
        throw new DomainPolicyError(failure);
      return { ...choice, maneuvers: material.data };
    }
    return choice;
  }

  private signature(body: string) {
    return createHmac('sha256', this.secret)
      .update('ruteam:route:v1:')
      .update(body)
      .digest('base64url');
  }
}
