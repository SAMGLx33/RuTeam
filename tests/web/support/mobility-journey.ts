import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { expect, type Page } from '@playwright/test';
import type { PrismaClient } from '../../../backend/src/generated/prisma/client';
import type {
  ReservationView,
  TripFeedPage,
  TripDirection,
  TripOperation,
  TripSummary,
  TripTrackingView,
} from '../../../packages/contracts/src/index';

const api = 'http://localhost:3100/api/v1';
const headers = { Origin: 'http://localhost:8082', 'x-ruteam-client': 'web' };
const campusCoordinates = { latitude: 3.404, longitude: -76.548 };
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
  await page.getByRole('button', { name: `Buscar lugar · ${title}` }).click();
  await page.getByLabel(`Lugar a buscar · ${title}`).fill(query);
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
  await page
    .getByLabel(`Instrucciones · ${title}`)
    .fill('Referencia pública sintética de prueba');
}

async function publishJourney(
  driver: Page,
  direction: TripDirection,
  label: string,
  departure: Date,
) {
  const inbound = direction === 'HACIA_USC';
  await driver.goto('/publish');
  const local = new Date(+departure - 5 * 3600_000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  await driver.getByLabel('Salida Colombia (AAAA-MM-DD HH:mm)').fill(local);
  const next = driver.getByRole('button', { name: 'Continuar', exact: true });
  await next.click();
  if (inbound)
    await driver.getByRole('radio', { name: 'Hacia la USC' }).click();
  const campusTitle = inbound ? 'Destino' : 'Origen';
  const externalTitle = inbound ? 'Origen' : 'Destino';
  await driver
    .getByRole('radio', { name: campusTitle + ' · Sede sintética QA' })
    .click();
  await driver
    .getByLabel('Punto de encuentro libre · ' + campusTitle)
    .fill('Entrada interior QA');
  if (!inbound) {
    await driver.context().grantPermissions(['geolocation']);
    await driver
      .context()
      .setGeolocation({ latitude: 3.51, longitude: -76.62, accuracy: 8 });
    const tiles: string[] = [];
    const track = (request: import('@playwright/test').Request) => {
      if (request.url().startsWith('https://tiles.ruteam.invalid/'))
        tiles.push(request.url());
    };
    driver.on('request', track);
    try {
      await driver
        .getByRole('button', { name: 'Centrar en mi ubicación · Destino' })
        .click();
      await expect(driver.getByLabel('Vista local · Destino')).toBeVisible();
      await driver
        .getByRole('button', { name: 'Acercar', exact: true })
        .click();
      expect(tiles).toEqual([]);
    } finally {
      driver.off('request', track);
    }
  }
  await searchPlace(driver, externalTitle, 'Lugar público Cali', label);
  await driver
    .getByLabel('Vías y referencias del recorrido')
    .fill('Recorrido de prueba con parada intermedia');
  await driver
    .getByRole('button', { name: 'Añadir parada', exact: true })
    .click();
  await searchPlace(driver, 'Parada 1', 'Paso Cali', 'Paso público QA');
  if (inbound) {
    await expect(
      driver.getByText(/Sólo paso. Los pasajeros abordan/),
    ).toBeVisible();
    await expect(
      driver.getByRole('radio', { name: /Descenso · Parada 1/ }),
    ).toHaveCount(0);
  }
  await driver
    .getByRole('checkbox', { name: /Autorizo enviar las coordenadas/ })
    .click();
  await driver.getByRole('button', { name: 'Consultar rutas viales' }).click();
  await driver.getByRole('button', { name: 'Elegir alternativa 2' }).click();
  await expect(
    driver.getByText('Alternativa vial seleccionada', { exact: true }),
  ).toBeVisible();
  await expect(
    driver.getByText(/Salida desde la parada.*Vía sintética QA/).first(),
  ).toBeVisible();
  await next.click();
  await driver
    .getByRole('radio', { name: 'Calcular aporte con gastos declarados' })
    .click();
  await driver.getByLabel('Combustible en COP').fill('8000');
  await driver.getByRole('checkbox', { name: 'Nequi', exact: true }).click();
  await driver.getByRole('button', { name: 'Revisar viaje' }).click();
  await driver
    .getByRole('checkbox', { name: /Confirmo que la ruta y los puntos/ })
    .click();
  const publication = driver.waitForResponse(
    (response) =>
      response.url() === api + '/trips' &&
      response.request().method() === 'POST',
  );
  await driver
    .getByRole('button', { name: 'Confirmar publicación', exact: true })
    .click();
  const receipt = await publication;
  expect(receipt.status(), await receipt.text()).toBe(201);
  const trip: TripSummary = await receipt.json();
  expect(trip.estimatedDurationMinutes).toBe(12);
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
  await passenger
    .getByRole('radio', { name: 'Descenso · ' + dropoffLabel, exact: true })
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
  // Provision only geography in the isolated test database. Both accounts, their
  // capabilities and every trip transition use the application's ordinary routes.
  const campus = await db.campusDestination.upsert({
    where: { code: 'USC-E2E-JOURNEY' },
    update: {},
    create: {
      code: 'USC-E2E-JOURNEY',
      campus: 'USC',
      name: 'Sede sintética QA',
      kind: 'CAMPUS',
      demo: false,
      ...campusCoordinates,
    },
  });
  const label = `Destino público QA ${stamp}`;
  const server = provider(label);
  await new Promise<void>((resolve, reject) =>
    server.once('error', reject).listen(3199, '127.0.0.1', resolve),
  );
  try {
    await call(passenger, 'POST', '/mobility/preferences', 201, {
      label: 'Regreso QA',
      campusPointId: campus.id,
      direction: 'DESDE_USC',
      days: [1, 2, 3, 4, 5, 6, 7],
      startMinute: 0,
      endMinute: 1439,
      placeLabel: label,
      ...destination,
      radiusKm: 0.5,
      vehicleTypes: ['CAR'],
      maxContributionCop: 5000,
      notificationsEnabled: true,
      active: true,
    });
    const departure = new Date(Date.now() + 35 * 60_000);
    const trip = await publishJourney(driver, 'DESDE_USC', label, departure);
    const [pickup, middle, dropoff] = trip.itinerary!.stops;
    const tripPath = '/trips/' + trip.id;
    const feed = await call<TripFeedPage>(
      passenger,
      'GET',
      '/trips/feed?tab=FOR_YOU',
      200,
    );
    expect(
      feed.items.find(({ id }) => id === trip.id)?.recommendation,
    ).toMatchObject({ type: 'DIRECT', pickupId: pickup.id });
    await call(passenger, 'PUT', '/mobility/saved-trips/' + trip.id, 200);
    await call(driver, 'POST', tripPath + '/delay', 200, {
      estimatedDepartureAt: new Date(+departure + 5 * 60_000).toISOString(),
    });
    const delayed = await call<TripFeedPage>(
      passenger,
      'GET',
      '/trips/feed?tab=FOR_YOU',
      200,
    );
    expect(
      delayed.items.find(({ id }) => id === trip.id)?.recommendation
        ?.pickupEstimatedAt,
    ).toBe(new Date(+departure + 5 * 60_000).toISOString());
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
    await driver
      .context()
      .setGeolocation({ latitude: 3.407, longitude: -76.5465, accuracy: 8 });
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
    await call(passenger, 'POST', tripPath + '/ratings', 201, {
      rateeId: trip.driverId,
      stars: 5,
      comment: 'Ensayo QA',
    });
    await call(passenger, 'POST', participation + '/compensation', 200, {
      method: 'NEQUI',
    });
    await call(
      driver,
      'POST',
      participation + '/compensation/resolution',
      200,
      { action: 'ACKNOWLEDGE' },
    );
    const inbound = await publishJourney(
      driver,
      'HACIA_USC',
      label,
      new Date(Date.now() + 80 * 60_000),
    );
    const [inOrigin, inWaypoint, inCampus] = inbound.itinerary!.stops;
    expect(inbound.itinerary?.stops.map(({ access }) => access)).toEqual([
      'PICKUP',
      'WAYPOINT',
      'DROPOFF',
    ]);
    expect(inCampus.campusSiteId).toBe(campus.id);
    const inboundPath = '/trips/' + inbound.id;
    await call(passenger, 'POST', inboundPath + '/participations', 400, {
      pickupId: inWaypoint.id,
      dropoffId: inCampus.id,
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
