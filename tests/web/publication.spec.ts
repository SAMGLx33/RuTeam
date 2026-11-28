import { submitLoginForm } from './support/fixture-login';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomInt } from 'node:crypto';

const apiUrl = 'http://localhost:3100/api/v1';
const webHeaders = {
  'x-ruteam-client': 'web',
  Origin: 'http://localhost:8082',
};
async function capture(page: Page, info: TestInfo, surface: string) {
  const directory = join(
    '/tmp/ruteam-product-ux/publication',
    info.project.name,
  );
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: join(directory, `${surface}.png`),
    fullPage: true,
  });
}
async function signIn(page: Page, identity: 'ana' | 'diego') {
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (!password)
    throw new Error('Configura AUTH_FIXTURE_PASSWORD en Playwright');
  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión', exact: true }),
  ).toBeVisible();
  await page
    .locator('input[aria-label="Correo institucional"]:visible')
    .fill(`${identity}@student-fixtures.ruteam.invalid`);
  await page.locator('input[aria-label="Contraseña"]:visible').fill(password);
  const response = await submitLoginForm(page);
  expect(response.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Inicio', exact: true }),
  ).toBeVisible();
  return ((await response.json()) as { account: { id: string } }).account.id;
}

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus && !page.isClosed()) {
    await capture(page, info, 'failure').catch(() => {
      info.annotations.push({
        type: 'evidence',
        description: 'No se pudo capturar la página fallida.',
      });
    });
  }
});
async function selectMapPoint(
  page: Page,
  label: string,
  name: string,
  x: number,
  y: number,
) {
  await page.getByRole('button', { name: 'Elegir en mapa · ' + label }).click();
  const map = page.getByRole('button', {
    name: 'Mapa para seleccionar · ' + label,
  });
  await expect(
    page.getByRole('button', { name: 'Marcar centro del mapa' }),
  ).toBeEnabled();
  const bounds = (await map.boundingBox())!;
  await map.click({ position: { x: bounds.width * x, y: bounds.height * y } });
  await page.getByLabel('Referencia pública · ' + label).fill(name);
  await page
    .getByRole('button', { name: 'Confirmar ubicación · ' + label })
    .click();
}

test('publicación, feed automático, aviso persistente y participación directa en dos sesiones', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }),
  });
  const plate = `Q${String.fromCharCode(65 + randomInt(26))}${String.fromCharCode(65 + randomInt(26))}${randomInt(100, 1000)}`;
  let vehicleId: string | undefined,
    tripId: string | undefined,
    preferenceId: string | undefined;
  let passengerId: string | undefined;
  const destination = `Floralia DEMO ${testInfo.project.name}`;
  const geocodedDestination = { latitude: 3.419432, longitude: -76.518765 };
  let selectedRoute:
    { type: 'LineString'; coordinates: number[][] } | undefined;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const passengerContext = await browser.newContext({
    viewport: page.viewportSize(),
  });
  const passenger = await passengerContext.newPage();
  passenger.on('pageerror', (error) => errors.push(error.message));
  try {
    await passenger.goto('http://localhost:8082');
    passengerId = await signIn(passenger, 'ana');
    await expect(
      passenger.getByRole('link', { name: 'Publicar viaje', exact: true }),
    ).toHaveCount(0);
    await page.route('https://tiles.ruteam.invalid/**', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dcebea"/></svg>',
      }),
    );
    await page.goto('/');
    await signIn(page, 'diego');
    await capture(page, testInfo, 'driver-home');
    await page.goto('/vehicles');
    await expect(
      page.getByRole('heading', { name: 'Vehículos y licencia', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Placa', { exact: true }).fill(plate);
    await page.getByLabel('Marca', { exact: true }).fill('Marca sintética');
    await page.getByLabel('Año del modelo').fill('2020');
    await page.getByLabel('Vencimiento SOAT (AAAA-MM-DD)').fill('2030-12-31');
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/vehicles') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Registrar vehículo', exact: true })
      .click();
    const result = await created;
    expect(result.status()).toBe(201);
    vehicleId = (await result.json()).id;
    await expect(
      page.getByText(
        'Vehículo registrado con información declarada; no es verificación oficial.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Revisar documentos/ }),
    ).toHaveCount(0);
    await capture(page, testInfo, 'vehicle-registration');
    await page.goto('/publish');
    await expect(
      page.getByRole('heading', { name: 'Publicar viaje' }),
    ).toBeVisible();
    await page.getByRole('radio', { name: new RegExp(plate) }).click();
    await page
      .getByLabel('Punto de encuentro en la USC')
      .fill('Sótano, junto a la escalera');
    await expect(page.getByLabel(/^(Latitud|Longitud|Geometría)/)).toHaveCount(
      0,
    );
    // Only the provider response is controlled. Selection and publication use the real form and DB.
    await page.route('**/api/v1/geocoding/search', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({
        query: 'Floralia Cali',
      });
      await route.fulfill({
        json: {
          items: [
            {
              label: destination,
              context: 'Palmira',
              latitude: 3.54,
              longitude: -76.3,
            },
            { label: destination, context: 'Cali', ...geocodedDestination },
          ],
          attribution: 'Datos © OpenStreetMap contributors',
        },
      });
    });
    await page
      .getByRole('button', { name: 'Elegir lugar · Destino', exact: true })
      .click();
    const locationSearch = page.getByLabel('Lugar a buscar · Destino', {
      exact: true,
    });
    await locationSearch.fill('Floralia Cali');
    if (testInfo.project.name === 'desktop')
      await locationSearch.press('Enter');
    else
      await page
        .getByRole('button', {
          name: 'Consultar lugares · Destino',
          exact: true,
        })
        .click();
    await expect(
      page.getByRole('button', {
        name: `${destination} · Palmira`,
        exact: true,
      }),
    ).toBeVisible();
    const searchResult = page.getByRole('button', {
      name: `${destination} · Cali`,
      exact: true,
    });
    await expect(searchResult).toBeVisible();
    await capture(page, testInfo, 'geocoding-results');
    if (testInfo.project.name === 'desktop') await searchResult.press('Enter');
    else await searchResult.click();
    await expect(
      page.getByText(destination, { exact: true }).first(),
    ).toBeVisible();
    await capture(page, testInfo, 'geocoding-selected-map');
    const now = new Date(Date.now() - 5 * 3600_000);
    const date = new Date(
      +now + (testInfo.project.name === 'desktop' ? 10 : 11) * 86400_000,
    )
      .toISOString()
      .slice(0, 10);
    const tomorrow = new Date(+now + 86400_000).toISOString().slice(0, 10);
    await page.getByRole('button', { name: 'Otra fecha' }).click();
    if (tomorrow.slice(0, 7) !== date.slice(0, 7))
      await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await page.getByRole('button', { name: date, exact: true }).click();
    for (const index of [1, 2]) {
      await page
        .getByRole('button', { name: '+ Añadir parada', exact: true })
        .click();
      await selectMapPoint(
        page,
        'Parada ' + index,
        'Parada ' + index + ' DEMO',
        0.5 + index * 0.1,
        0.5 - index * 0.1,
      );
    }
    await page.getByRole('button', { name: 'Opciones adicionales' }).click();
    await page.getByRole('checkbox', { name: 'Parada 2 sólo de paso' }).click();
    await page
      .getByLabel('Nota del conductor (opcional)')
      .fill('Ejemplo sintético, pasando por Calle Quinta');
    // The HTTP provider is tested separately. This controlled response covers
    // selecting an alternative and persisting exactly the chosen geometry.
    await page.route('**/api/v1/trips/route-options', async (route) => {
      const origin = await db.campusDestination.findUniqueOrThrow({
        where: { code: 'USC-CALI-PAMPALINDA' },
      });
      const submitted = route.request().postDataJSON();
      expect(submitted.destination).toMatchObject(geocodedDestination);
      const coordinates = [
        [Number(origin.longitude), Number(origin.latitude)],
        ...[...submitted.stops, submitted.destination].map(
          (point: { longitude: number; latitude: number }) => [
            point.longitude,
            point.latitude,
          ],
        ),
      ];
      selectedRoute = { type: 'LineString', coordinates };
      if (!preferenceId) {
        const campus = await db.campusDestination.findUniqueOrThrow({
          where: { code: 'USC-CALI-PAMPALINDA' },
        });
        // A disposable private preference uses the same selected public point as
        // the trip. Only cartography is mocked; matching, notifications and DB are real.
        const preference = await passenger.request.post(
          `${apiUrl}/mobility/preferences`,
          {
            headers: webHeaders,
            data: {
              label: `Movilidad QA ${testInfo.project.name}`,
              campusPointId: campus.id,
              direction: 'DESDE_USC',
              days: [1, 2, 3, 4, 5, 6, 7],
              startMinute: 0,
              endMinute: 1439,
              placeLabel: destination,
              latitude: submitted.destination.latitude,
              longitude: submitted.destination.longitude,
              radiusKm: 0.1,
              vehicleTypes: ['CAR'],
              notificationsEnabled: true,
              active: true,
            },
          },
        );
        expect(preference.status()).toBe(201);
        preferenceId = (await preference.json()).id;
      }
      await route.fulfill({
        json: [
          {
            geometry: selectedRoute,
            distanceMeters: 5000,
            durationMinutes: 45,
          },
        ],
      });
    });
    await page
      .getByRole('button', { name: 'Autorizar y calcular ruta' })
      .click();
    await expect(page.getByText(/plaza.*Ruta calculada/)).toBeVisible();
    await page
      .getByRole('radio', { name: 'Calcular aporte voluntario' })
      .click();
    await page.getByLabel('Combustible en COP').fill('10001');
    await page.getByRole('checkbox', { name: 'Nequi', exact: true }).click();
    await expect(page.getByText('Resumen', { exact: true })).toBeVisible();
    await expect(
      page.getByLabel(/Vista geográfica de la geometría/),
    ).toBeVisible();
    await capture(page, testInfo, 'publication-preview');
    const published = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/trips') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Publicar viaje', exact: true })
      .click();
    const response = await published;
    expect(response.status()).toBe(201);
    tripId = (await response.json()).id;
    const persisted = await db.trip.findUniqueOrThrow({
      where: { id: tripId },
      include: { stops: { orderBy: { position: 'asc' } } },
    });
    const persistedDestination = persisted.stops.at(-1);
    expect(persistedDestination?.label).toBe(destination);
    expect(Number(persistedDestination?.latitude)).toBe(
      geocodedDestination.latitude,
    );
    expect(Number(persistedDestination?.longitude)).toBe(
      geocodedDestination.longitude,
    );
    expect(persisted.routeGeometry).toEqual(selectedRoute);
    await expect(
      page.getByText('Viaje publicado', { exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Gestionar mi viaje' }).click();
    await page.reload();
    await expect(page.getByText(destination, { exact: false })).toBeVisible();

    await capture(page, testInfo, 'published-trips');
    await passenger.goto('http://localhost:8082/mobility');
    await expect(
      passenger.getByRole('heading', { name: 'Preferencias de movilidad' }),
    ).toBeVisible();
    await expect(
      passenger.getByText(`Movilidad QA ${testInfo.project.name}`, {
        exact: true,
      }),
    ).toBeVisible();
    await capture(passenger, testInfo, 'mobility-preferences');
    // Recommendations appear without using the manual search form.
    await passenger.goto('http://localhost:8082/available-trips');
    await expect(
      passenger.getByRole('heading', {
        name: 'Viajes disponibles',
        exact: true,
      }),
    ).toBeVisible();
    await passenger.getByRole('tab', { name: 'Para ti', exact: true }).click();
    const feedLink = passenger.locator(`a[href="/trip/${tripId}"]`);
    await expect(feedLink).toBeVisible();
    await expect(
      passenger.getByText('Recogida compatible', { exact: true }).first(),
    ).toBeVisible();
    await capture(passenger, testInfo, 'recommended-feed');
    await expect
      .poll(() =>
        db.tripNotification.count({
          where: { tripId, recipientId: passengerId },
        }),
      )
      .toBe(1);
    // A changed preference removes the trip from Para ti but leaves discovery open.
    await passenger.goto('http://localhost:8082/mobility');
    await passenger
      .getByRole('button', { name: 'Editar preferencia', exact: true })
      .click();
    await passenger
      .getByRole('radio', { name: 'Hacia la USC', exact: true })
      .click();
    await capture(passenger, testInfo, 'mobility-editor');
    const changed = passenger.waitForResponse(
      (result) =>
        result.url().endsWith(`/mobility/preferences/${preferenceId}`) &&
        result.request().method() === 'PATCH',
    );
    await passenger
      .getByRole('button', { name: 'Guardar preferencia' })
      .click();
    expect((await changed).status()).toBe(200);
    await passenger.goto('http://localhost:8082/available-trips');
    await passenger.getByRole('tab', { name: 'Para ti', exact: true }).click();
    await expect(
      passenger.getByText('Todavía no hay recomendaciones'),
    ).toBeVisible();
    await expect(feedLink).toHaveCount(0);
    const allTrips = passenger.getByRole('tab', { name: 'Todos', exact: true });
    if (testInfo.project.name === 'desktop') await allTrips.press('Enter');
    else await allTrips.click();
    await expect(feedLink).toBeVisible();
    await capture(passenger, testInfo, 'general-feed');
    await passenger.goto('http://localhost:8082/search-trips');
    await passenger.getByLabel('Origen deseado').fill('USC');
    await passenger.getByLabel('Destino deseado').fill(destination);
    await passenger
      .getByRole('button', { name: 'Buscar viajes disponibles' })
      .click();
    await expect(
      passenger.getByText(destination, { exact: false }),
    ).toBeVisible();
    await passenger
      .getByRole('button', { name: 'Ver recorrido y participar' })
      .click();
    await expect(
      passenger.getByText('3. Parada 2 DEMO · Sólo paso'),
    ).toBeVisible();
    await expect(
      passenger.getByRole('radio', { name: 'Encuentro · Parada 2 DEMO' }),
    ).toHaveCount(0);
    await expect(
      passenger.getByText('Encuentro · Sótano, junto a la escalera'),
    ).toBeVisible();
    await passenger.getByLabel(/Vista geográfica de la geometría/).screenshot({
      path: `/tmp/ruteam-route-geometry-${testInfo.project.name}.png`,
    });
    await passenger.screenshot({
      path: `/tmp/ruteam-driver-routes-${testInfo.project.name}.png`,
      fullPage: true,
    });
    // Retain the search/stop assertions above, then participate from the real detail.
    await expect
      .poll(
        async () => {
          const result = await passenger.request.get(`${apiUrl}/notifications`);
          expect(result.status()).toBe(200);
          const body = await result.json();
          return body.items.filter(
            (item: { tripId: string }) => item.tripId === tripId,
          ).length;
        },
        { timeout: 20000 },
      )
      .toBe(1);
    await passenger.goto('http://localhost:8082/notifications');
    await expect(
      passenger.getByRole('heading', { name: 'Notificaciones', exact: true }),
    ).toBeVisible();
    const matchInbox = await passenger.request.get(`${apiUrl}/notifications`);
    expect(matchInbox.ok()).toBe(true);
    const matchNotice = (await matchInbox.json()).items.find(
      (item: { tripId: string; kind: string }) =>
        item.tripId === tripId && item.kind === 'TRIP_MATCH',
    );
    expect(matchNotice).toBeDefined();
    const notice = passenger
      .locator(`a[href="/open/notice/${matchNotice.id}"]`)
      .filter({ hasText: 'Abrir viaje' });
    await expect(notice).toHaveCount(1);
    await capture(passenger, testInfo, 'notifications');
    await notice.click();
    await expect(
      passenger
        .getByText('Esta recomendación ya no está vigente.')
        .filter({ visible: true }),
    ).toBeVisible();
    // The old recommendation is stale after editing preferences; ordinary discovery remains authorized.
    await passenger.goto('http://localhost:8082/trip/' + tripId);
    await expect(passenger).toHaveURL(new RegExp(`/trip/${tripId}$`));
    await expect(
      passenger.getByRole('heading', {
        name: 'Detalle del viaje',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      passenger.getByText('1 plaza disponible', { exact: true }),
    ).toBeVisible();
    await expect(
      passenger.getByText(/Aporte sugerido por pasajero/),
    ).toContainText('5.000');
    await expect(passenger.getByText(/Métodos disponibles/)).toContainText(
      'Nequi',
    );
    await expect(passenger.getByText(/Costo total estimado/)).toHaveCount(0);
    await capture(passenger, testInfo, 'trip-detail');
    await passenger
      .getByRole('button', { name: 'Tomar viaje', exact: true })
      .click();
    const confirmation = passenger.waitForResponse(
      (result) =>
        result.url().endsWith(`/trips/${tripId}/participations`) &&
        result.request().method() === 'POST',
    );
    await passenger
      .getByRole('button', { name: 'Confirmar participación', exact: true })
      .click();
    expect((await confirmation).status()).toBe(201);
    await expect(
      passenger.getByRole('link', {
        name: 'Ver mi participación confirmada',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      passenger.getByText('0 plazas disponibles', { exact: true }),
    ).toBeVisible();
    await capture(passenger, testInfo, 'confirmed-detail');
    expect(
      await db.tripNotification.count({
        where: { tripId, recipientId: passengerId, kind: 'TRIP_MATCH' },
      }),
    ).toBe(1);

    await expect(
      passenger.getByLabel('Códigos de acompañantes DEMO (opcional)'),
    ).toHaveCount(0);
    await passenger
      .getByRole('link', { name: 'Chat del viaje', exact: true })
      .click();
    await passenger
      .getByLabel('Mensaje', { exact: true })
      .fill('Nos vemos junto al acceso público.');
    await passenger.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(
      passenger.getByText('Nos vemos junto al acceso público.'),
    ).toBeVisible();
    const driverChat = await page.context().newPage();
    try {
      await driverChat.goto('http://localhost:8082/notifications');
      const chatInbox = await driverChat.request.get(`${apiUrl}/notifications`);
      expect(chatInbox.ok()).toBe(true);
      const chatNotice = (await chatInbox.json()).items.find(
        (item: { tripId: string; kind: string }) =>
          item.tripId === tripId && item.kind === 'CHAT_MESSAGE',
      );
      expect(chatNotice).toBeDefined();
      const notice = driverChat
        .locator(`a[href="/open/notice/${chatNotice.id}"]`)
        .filter({ hasText: 'Abrir chat' });
      await expect(notice).toHaveCount(1);
      await notice.click();
      await expect(
        driverChat.getByText('Nos vemos junto al acceso público.'),
      ).toBeVisible();
      await driverChat
        .getByLabel('Mensaje', { exact: true })
        .fill('Confirmado, nos vemos allí.');
      await driverChat.getByRole('button', { name: 'Enviar mensaje' }).click();
      await expect(
        driverChat.getByText('Confirmado, nos vemos allí.'),
      ).toBeVisible();
      await passenger.reload();
      await expect(
        passenger.getByText('Confirmado, nos vemos allí.'),
      ).toBeVisible();
      await passenger
        .getByRole('button', { name: 'Marcar conversación como leída' })
        .click();
      await expect(
        passenger.getByRole('button', {
          name: 'Marcar conversación como leída',
        }),
      ).toHaveCount(0);
      await capture(passenger, testInfo, 'trip-chat');
    } finally {
      await driverChat.close();
    }

    expect(
      await db.reservation.count({ where: { tripId, status: 'CONFIRMED' } }),
    ).toBe(1);
    expect(
      await db.reservation.count({ where: { tripId, status: 'PENDING' } }),
    ).toBe(0);
    const publishedTrip = await db.trip.findUniqueOrThrow({
      where: { id: tripId },
    });
    expect(publishedTrip.occupiedSeats).toBe(1);
    const publishedCard = page.getByTestId(`driver-trip-${tripId}`);
    await publishedCard
      .getByRole('button', { name: 'Ver recorrido y participantes' })
      .click();
    await expect(
      publishedCard.getByRole('button', { name: 'Aceptar solicitud' }),
    ).toHaveCount(0);
    await expect(
      publishedCard.getByText('En espera de recogida · Viaje programado', {
        exact: true,
      }),
    ).toBeVisible();

    // Enter the origin boarding window without waiting for the scheduled trip.
    const boardingDeparture = new Date(Date.now() + 15 * 60_000);
    await db.trip.update({
      where: { id: tripId },
      data: {
        departureAt: boardingDeparture,
        expectedEndAt: new Date(
          boardingDeparture.getTime() +
            publishedTrip.estimatedDurationMinutes * 60_000,
        ),
      },
    });
    await passenger.goto(`http://localhost:8082/trip-operation/${tripId}`);
    await expect(
      passenger.getByRole('heading', {
        name: 'Seguimiento y resumen del viaje',
      }),
    ).toBeVisible();
    const showPass = passenger.getByRole('button', {
      name: 'Mostrar QR de abordaje',
    });
    await showPass.click();
    const qr = passenger.getByLabel('QR temporal de abordaje de RuTeam');
    await expect(qr).toBeVisible();
    await expect(passenger.getByText(/Válido hasta/)).toBeVisible();
    await expect(
      passenger.getByRole('button', { name: 'Iniciar viaje', exact: true }),
    ).toHaveCount(0);
    await passenger.getByRole('button', { name: 'Ocultar QR' }).click();
    await expect(qr).toHaveCount(0);

    await passenger.goto('http://localhost:8082/my-reservations');
    await expect(
      passenger.getByText('En espera de recogida · Viaje programado'),
    ).toBeVisible();
    await passenger
      .getByRole('button', { name: 'Cancelar participación' })
      .click();
    await passenger.getByRole('button', { name: 'Confirmar retiro' }).click();
    await expect(
      passenger.getByText('Cancelada · Viaje programado'),
    ).toBeVisible();
    expect(
      (await db.trip.findUniqueOrThrow({ where: { id: tripId } }))
        .occupiedSeats,
    ).toBe(0);
    expect(
      await db.reservation.count({ where: { tripId, status: 'CANCELLED' } }),
    ).toBe(1);
    await capture(passenger, testInfo, 'participation-history');
    expect(
      (await passenger.request.get(`${apiUrl}/trips/${tripId}/chat`)).status(),
    ).toBe(404);
    expect(errors).toEqual([]);
  } catch (error) {
    await capture(passenger, testInfo, 'failure-passenger').catch(
      () => undefined,
    );
    throw error;
  } finally {
    await passengerContext.close().catch(() => undefined);
    if (preferenceId)
      await db.mobilityPreference.deleteMany({ where: { id: preferenceId } });
    if (tripId) {
      await db.reservation.deleteMany({ where: { tripId } });
      await db.trip.deleteMany({ where: { id: tripId } });
    }
    if (vehicleId) await db.vehicle.deleteMany({ where: { id: vehicleId } });
    await db.$disconnect();
  }
});
