import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { expect, type Page } from '@playwright/test';
import type { PrismaClient } from '../../../backend/src/generated/prisma/client';
import type {
  ReservationView,
  TripDirection,
  TripOperation,
  TripSummary,
  TripTrackingView,
} from '../../../packages/contracts/src/index';

const api = 'http://localhost:3100/api/v1';
const headers = { Origin: 'http://localhost:8082', 'x-ruteam-client': 'web' };
const destination = { latitude: 3.421, longitude: -76.538 };
const waypoint = { latitude: 3.414, longitude: -76.543 };

async function call<T = unknown>(
  page: Page,
  method: string,
  path: string,
  status: number,
  data?: unknown,
): Promise<T> {
  const response = await page.request.fetch(api + path, {
    method,
    headers,
    data,
  });
  expect(response.status(), `${method} ${path}: ${await response.text()}`).toBe(
    status,
  );
  return (status === 204 ? undefined : await response.json()) as T;
}

function provider(label: string) {
  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api') {
      const point = url.searchParams.get('q')?.includes('Paso')
        ? waypoint
        : destination;
      response.end(
        JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [point.longitude, point.latitude],
              },
              properties: {
                name: point === waypoint ? 'Paso público QA' : label,
                city: 'Cali',
                countrycode: 'CO',
              },
            },
          ],
        }),
      );
      return;
    }
    const prefix = '/route/v1/driving/';
    if (
      !url.pathname.startsWith(prefix) ||
      url.searchParams.get('steps') !== 'true'
    ) {
      response.writeHead(400).end(JSON.stringify({ code: 'InvalidQuery' }));
      return;
    }
    const coordinates = url.pathname
      .slice(prefix.length)
      .split(';')
      .map((point) => point.split(',').map(Number));
    const line = (coordinates: number[][]) => ({
      type: 'LineString',
      coordinates,
    });
    const route = (seconds: number) => ({
      distance: (coordinates.length - 1) * 1100,
      duration: (coordinates.length - 1) * seconds,
      geometry: line(coordinates),
      legs: coordinates.slice(1).map((end, index) => ({
        duration: seconds,
        steps: [
          {
            distance: 1100,
            duration: seconds,
            name: 'Vía sintética QA',
            geometry: line([coordinates[index], end]),
            maneuver: { type: 'depart', location: coordinates[index] },
          },
          {
            distance: 0,
            duration: 0,
            name: '',
            geometry: line([end, end]),
            maneuver: { type: 'arrive', location: end },
          },
        ],
      })),
    });
    response.end(
      JSON.stringify({ code: 'Ok', routes: [route(300), route(360)] }),
    );
  });
}

async function searchPlace(
  page: Page,
  title: string,
  query: string,
  label: string,
) {
  const input = page.getByLabel(`Lugar a buscar · ${title}`);
  if (!(await input.isVisible()))
    await page.getByRole('button', { name: `Elegir lugar · ${title}` }).click();
  await input.fill(query);
  const geocoding = page.waitForResponse(
    (response) => response.url() === api + '/geocoding/search',
  );
  await page
    .getByRole('button', { name: `Consultar lugares · ${title}` })
    .click();
  const result = await geocoding;
  expect(result.status(), await result.text()).toBe(200);
  await page
    .getByRole('button', { name: label + ' · Cali', exact: true })
    .click();
}

async function publishJourney(
  driver: Page,
  direction: TripDirection,
  label: string,
) {
  const inbound = direction === 'HACIA_USC';
  await driver.goto('/publish');
  if (inbound) {
    await driver.getByRole('radio', { name: 'Hacia la USC' }).click();
    await expect(
      driver.getByText('Destino · Ciudadela Pampalinda'),
    ).toBeVisible();
    await expect(
      driver.getByRole('button', { name: '+ Añadir parada' }),
    ).toHaveCount(0);
    await driver.getByRole('button', { name: 'Elegir lugar · Origen' }).click();
    await driver
      .getByRole('button', { name: 'Elegir en mapa · Origen' })
      .click();
    const map = driver.getByRole('button', {
      name: 'Mapa para seleccionar · Origen',
    });
    await map.scrollIntoViewIfNeeded();
    const touch = await driver.evaluate(() => navigator.maxTouchPoints > 0);
    if (!touch) {
      await map.hover();
      await driver.mouse.wheel(0, -120);
    }
    const bounds = (await map.boundingBox())!;
    if (!touch) {
      await driver.mouse.move(
        bounds.x + bounds.width * 0.4,
        bounds.y + bounds.height * 0.32,
      );
      await driver.mouse.down();
      await driver.mouse.move(
        bounds.x + bounds.width * 0.57,
        bounds.y + bounds.height * 0.4,
        { steps: 8 },
      );
      await driver.mouse.up();
    }
    await expect(driver.getByLabel('Referencia pública · Origen')).toHaveCount(
      0,
    );
    const position = {
      x: Math.floor(bounds.width * 0.6),
      y: Math.floor(bounds.height * 0.38),
    };
    const marker = driver.getByRole('button', {
      name: 'Punto marcado',
      exact: true,
    });
    await expect(async () => {
      if (touch) await map.tap({ position });
      else await map.click({ position });
      await expect(marker).toBeVisible({ timeout: 800 });
    }).toPass({ timeout: 12000 });
    const selected = (await marker.boundingBox())!;
    const currentMap = (await map.boundingBox())!;
    expect(
      Math.abs(selected.x + selected.width / 2 - currentMap.x - position.x),
    ).toBeLessThan(4);
    expect(
      Math.abs(selected.y + selected.height / 2 - currentMap.y - position.y),
    ).toBeLessThan(4);
    await driver.getByLabel('Referencia pública · Origen').fill(label);
    await driver
      .getByRole('button', { name: 'Confirmar ubicación · Origen' })
      .click();
  } else {
    await driver.getByRole('radio', { name: 'Desde la USC' }).click();
    await driver
      .getByLabel('Punto de encuentro en la USC')
      .fill('Plazoleta de los Sabios');
    await searchPlace(driver, 'Destino', 'Lugar público Cali', label);
    await driver.getByRole('button', { name: '+ Añadir parada' }).click();
    await searchPlace(driver, 'Parada 1', 'Paso Cali', 'Paso público QA');
  }
  const routeRequest = driver.waitForRequest(
    (response) => response.url() === api + '/trips/route-options',
  );
  await driver
    .getByRole('button', { name: 'Autorizar y calcular ruta' })
    .click();
  const routeInput = (await routeRequest).postDataJSON();
  await expect(driver.getByText(/plaza.*Ruta calculada/)).toBeVisible();
  await driver.getByRole('radio', { name: /Ruta 2 ·/ }).click();
  await driver.getByRole('button', { name: 'Mañana', exact: true }).click();
  await driver.getByRole('button', { name: /Hora de salida/ }).click();
  await driver
    .getByRole('button', {
      name: inbound ? 'Horas 12' : 'Horas 10',
      exact: true,
    })
    .click();
  await driver.getByRole('button', { name: 'Minutos 15', exact: true }).click();
  await driver.getByRole('button', { name: 'Confirmar hora' }).click();
  await driver
    .getByRole('button', { name: 'Añadir plaza', exact: true })
    .click();
  await driver
    .getByRole('checkbox', { name: /Confirmo que la ruta y los puntos/ })
    .click();
  const receipt = await clickMutation(driver, 'Publicar viaje', '/trips', 201);
  const trip: TripSummary = await receipt.json();
  await expect(
    driver.getByText('Viaje publicado', { exact: true }),
  ).toBeVisible();
  await driver.reload();
  await expect(
    driver.getByRole('heading', { name: 'Detalle del viaje' }),
  ).toBeVisible();
  expect(trip.offeredSeats).toBe(2);
  if (inbound) {
    expect(routeInput.origin).toMatchObject({
      label,
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
    expect(trip.itinerary?.stops[0]).toMatchObject({
      label,
      latitude: Number(routeInput.origin.latitude.toFixed(6)),
      longitude: Number(routeInput.origin.longitude.toFixed(6)),
    });
    expect(trip.itinerary?.geometry?.coordinates[0]).toEqual([
      Number(routeInput.origin.longitude.toFixed(6)),
      Number(routeInput.origin.latitude.toFixed(6)),
    ]);
  }
  return trip;
}

async function clickMutation(
  page: Page,
  name: string,
  path: string,
  status: number,
) {
  const receipt = page.waitForResponse(
    (response) =>
      response.url() === api + path && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name, exact: true }).click();
  const result = await receipt;
  if (result.status() !== status)
    expect(result.status(), await result.text()).toBe(status);
  return result;
}

async function discoverAndConfirm(
  passenger: Page,
  trip: TripSummary,
  dropoffLabel: string,
) {
  await passenger.goto('/available-trips');
  await passenger.locator(`a[href="/trip/${trip.id}"]`).click();
  if (trip.itinerary?.direction === 'DESDE_USC') {
    await expect(
      passenger.getByText('Encuentro · Plazoleta de los Sabios'),
    ).toBeVisible();
    await passenger
      .getByRole('radio', { name: 'Descenso · ' + dropoffLabel, exact: true })
      .click();
  } else {
    await expect(
      passenger.getByText('Descenso · ' + dropoffLabel, { exact: true }),
    ).toBeVisible();
  }
  await passenger
    .getByRole('button', { name: 'Tomar viaje', exact: true })
    .click();
  const result = await clickMutation(
    passenger,
    'Confirmar participación',
    '/trips/' + trip.id + '/participations',
    201,
  );
  const reservation: ReservationView = await result.json();
  await expect(
    passenger.getByRole('link', { name: 'Ver mi participación confirmada' }),
  ).toBeVisible();
  await passenger.reload();
  await expect(
    passenger.getByRole('link', { name: 'Ver mi participación confirmada' }),
  ).toBeVisible();
  return reservation;
}

export async function exerciseMobility(
  db: PrismaClient,
  passenger: Page,
  driver: Page,
  stamp: string,
) {
  const campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-CALI-PAMPALINDA' },
  });
  expect(campus.latitude).not.toBeNull();
  await driver.route('https://tiles.ruteam.invalid/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dcebea"/></svg>',
    }),
  );
  const label = `Destino público QA ${stamp}`;
  const server = provider(label);
  await new Promise<void>((resolve, reject) =>
    server.once('error', reject).listen(3199, '127.0.0.1', resolve),
  );
  try {
    const trip = await publishJourney(driver, 'DESDE_USC', label);
    const [pickup, middle, dropoff] = trip.itinerary!.stops;
    expect(pickup.campusSiteId).toBe(campus.id);
    const tripPath = '/trips/' + trip.id;
    const boarding = await discoverAndConfirm(passenger, trip, middle.label);
    expect(boarding.pickup.id).toBe(pickup.id);
    expect(boarding.dropoff.id).toBe(middle.id);
    expect(
      (await call<TripSummary[]>(driver, 'GET', '/trips/my', 200)).find(
        ({ id }) => id === trip.id,
      )?.occupiedSeats,
    ).toBe(1);
    const participation = '/participations/' + boarding.id;
    await call(passenger, 'GET', '/mobility/agenda', 200);
    await expect
      .poll(async () =>
        JSON.stringify(await call(passenger, 'GET', '/notifications', 200)),
      )
      .toContain('PARTICIPATION_CONFIRMED');
    const message = {
      clientMessageId: randomUUID(),
      body: 'Mensaje sintético de coordinación QA',
    };
    await call(passenger, 'POST', tripPath + '/chat/messages', 201, message);
    expect(
      JSON.stringify(await call(driver, 'GET', tripPath + '/chat', 200)),
    ).toContain(message.body);
    await driver.goto('/trip-operation/' + trip.id);
    await expect(
      driver.getByText('Pasajera de prueba', { exact: true }),
    ).toBeVisible();
    await clickMutation(driver, 'Iniciar viaje', tripPath + '/transition', 200);
    await clickMutation(
      driver,
      'Confirmar abordaje',
      participation + '/board',
      200,
    );
    const operation = await call<TripOperation>(
      driver,
      'GET',
      tripPath + '/operation',
      200,
    );
    expect(operation.maneuvers?.map(({ kind }) => kind)).toEqual([
      'DEPART',
      'ARRIVE',
      'DEPART',
      'ARRIVE',
    ]);

    await driver.context().grantPermissions(['geolocation']);
    const [routeStart, firstStop] = trip.itinerary!.geometry!.coordinates;
    await driver.context().setGeolocation({
      latitude: (routeStart[1] + firstStop[1]) / 2,
      longitude: (routeStart[0] + firstStop[0]) / 2,
      accuracy: 8,
    });
    await driver.goto('/trip-operation/' + trip.id);
    await driver.getByRole('button', { name: 'Activar compartición' }).click();
    await expect(driver.getByTestId('next-route-maneuver')).toBeVisible();
    await expect(driver.getByText(/ETA según posición y ruta/)).toBeVisible();
    const gpsPath = tripPath + '/location';
    await expect
      .poll(
        async () =>
          (await call<TripTrackingView>(passenger, 'GET', gpsPath, 200)).state,
      )
      .toBe('AVAILABLE');

    await clickMutation(
      driver,
      'Registrar llegada · ' + middle.label,
      `${tripPath}/stops/${middle.id}/reach`,
      200,
    );
    await clickMutation(
      driver,
      'Registrar descenso',
      participation + '/drop-off',
      200,
    );
    await clickMutation(
      driver,
      'Registrar llegada · ' + dropoff.label,
      `${tripPath}/stops/${dropoff.id}/reach`,
      200,
    );
    await call(passenger, 'GET', gpsPath, 404);
    const afterDropoff = await call<TripOperation>(
      passenger,
      'GET',
      tripPath + '/operation',
      200,
    );
    expect(afterDropoff.participation?.stage).toBe('DROPPED_OFF');
    await clickMutation(
      driver,
      'Finalizar viaje',
      tripPath + '/transition',
      200,
    );
    expect(
      (
        await call<TripOperation>(
          passenger,
          'GET',
          tripPath + '/operation',
          200,
        )
      ).status,
    ).toBe('COMPLETADO');

    await call(passenger, 'GET', '/mobility/activity', 200);
    const inbound = await publishJourney(
      driver,
      'HACIA_USC',
      'Origen marcado ' + stamp,
    );
    const [inOrigin, inCampus] = inbound.itinerary!.stops;
    expect(inbound.itinerary?.stops.map(({ access }) => access)).toEqual([
      'PICKUP',
      'DROPOFF',
    ]);
    expect(inCampus.campusSiteId).toBe(campus.id);
    const inboundPath = '/trips/' + inbound.id;
    await call(passenger, 'POST', inboundPath + '/participations', 400, {
      pickupId: inCampus.id,
      dropoffId: inOrigin.id,
    });
    const confirmed = await discoverAndConfirm(
      passenger,
      inbound,
      inCampus.label,
    );
    expect(confirmed.pickup.id).toBe(inOrigin.id);
    expect(confirmed.dropoff.id).toBe(inCampus.id);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
