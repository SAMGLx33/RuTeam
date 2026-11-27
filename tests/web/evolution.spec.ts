import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { expect, test } from '@playwright/test';
import {
  expectSuccessfulLogin,
  submitFixtureLogin,
} from './support/fixture-login';

const api = 'http://localhost:3100/api/v1';
const web = { Origin: 'http://localhost:8082', 'x-ruteam-client': 'web' };

test('la agenda abre el viaje, SSE actualiza plazas y las preferencias sobreviven a recargar', async ({
  page,
  request,
}) => {
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (!password) throw new Error('Configura la contraseña de pruebas');
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (
    !databaseUrl ||
    databaseUrl === process.env.DATABASE_URL ||
    !new URL(databaseUrl).pathname.endsWith('_test')
  )
    throw new Error('PostgreSQL web de prueba aislado requerido');

  await page.goto('/');
  await page
    .getByLabel('Correo institucional', { exact: true })
    .fill('diego@student-fixtures.ruteam.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  const stream = page.waitForResponse(
    (response) =>
      response.url() === api + '/realtime' && response.status() === 200,
  );
  await expectSuccessfulLogin(page);
  const response = await stream;
  expect(response.headers()['content-type']).toContain('text/event-stream');
  await expect(
    page.getByRole('heading', { name: 'Inicio', exact: true }),
  ).toBeVisible();

  const [points, vehicles] = await Promise.all([
    page.request.get(api + '/campus/meeting-points', { headers: web }),
    page.request.get(api + '/vehicles', { headers: web }),
  ]);
  const campus = (await points.json()).find(
    ({ kind }: { kind: string }) => kind === 'PLAZA',
  );
  const vehicle = (await vehicles.json()).find(
    ({ plate }: { plate: string }) => plate === 'STU123',
  );
  expect(campus && vehicle).toBeTruthy();
  const published = await page.request.post(api + '/trips', {
    headers: web,
    data: {
      vehicleId: vehicle.id,
      departureAt: new Date(Date.now() + 12 * 3600000).toISOString(),
      estimatedDurationMinutes: 30,
      offeredSeats: 1,
      ruleIds: [],
      itinerary: {
        direction: 'DESDE_USC',
        publicMeetingPoints: true,
        description: 'Recorrido sintetico de agenda',
        origin: { campusPointId: campus.id, label: 'Punto de encuentro' },
        destination: {
          label: 'Destino público',
          latitude: 3.45,
          longitude: -76.51,
          instructions: 'Punto público señalizado',
        },
        stops: [],
      },
    },
  });
  expect(published.status()).toBe(201);
  const { id, itinerary } = await published.json();
  const initial = await page.request.get(api + '/notification-settings', {
    headers: web,
  });
  expect(initial.ok()).toBe(true);
  const { preferences } = await initial.json();

  try {
    await page
      .getByRole('link', { name: 'Agenda de viajes', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Agenda de viajes' }),
    ).toBeVisible();
    await page
      .locator('a[href="/trip-operation/' + id + '"]:visible')
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Seguimiento y resumen del viaje' }),
    ).toBeVisible();
    await expect(
      page.getByText('Pendientes en otras paradas · 0', { exact: true }),
    ).toBeVisible();

    const passenger = await submitFixtureLogin(() =>
      request.post(api + '/auth/login', {
        headers: { 'x-ruteam-client': 'native' },
        data: { email: 'ana@student-fixtures.ruteam.invalid', password },
      }),
    );
    expect(passenger.status()).toBe(200);
    const auth = {
      'x-ruteam-client': 'native',
      Authorization: 'Bearer ' + (await passenger.json()).token,
    };
    const joined = await request.post(
      api + '/trips/' + id + '/participations',
      {
        headers: auth,
        data: {
          pickupId: itinerary.stops[0].id,
          dropoffId: itinerary.stops[1].id,
        },
      },
    );
    expect(joined.status()).toBe(201);
    await expect(
      page.getByText('Pendientes en otras paradas · 1', { exact: true }),
    ).toBeVisible({ timeout: 8000 });

    await page.goto('/notification-settings');
    const option = page.getByRole('checkbox', {
      name: 'Recomendaciones de viajes',
      exact: true,
    });
    await expect(option).toHaveAttribute(
      'aria-checked',
      String(preferences.recommendations),
    );
    await option.click();
    await expect(option).toHaveAttribute(
      'aria-checked',
      String(!preferences.recommendations),
    );
    await page.reload();
    await expect(option).toHaveAttribute(
      'aria-checked',
      String(!preferences.recommendations),
    );
  } finally {
    await page.request.put(api + '/notification-settings', {
      headers: web,
      data: preferences,
    });
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    try {
      await db.reservation.deleteMany({ where: { tripId: id } });
      await db.trip.deleteMany({ where: { id } });
    } finally {
      await db.$disconnect();
    }
  }
});
