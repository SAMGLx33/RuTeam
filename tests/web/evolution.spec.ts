import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { expect, test } from '@playwright/test';
import type { NotificationPage } from '../../packages/contracts/src/index';
import {
  expectSuccessfulLogin,
  submitFixtureLogin,
} from './support/fixture-login';

const api = 'http://localhost:3100/api/v1';
const web = { Origin: 'http://localhost:8082', 'x-ruteam-client': 'web' };

test('agenda, SSE, preferencias y enlaces a avisos propios', async ({
  browser,
  baseURL,
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
  const { id, itinerary, departureAt } = await published.json();
  const initial = await page.request.get(api + '/notification-settings', {
    headers: web,
  });
  expect(initial.ok()).toBe(true);
  const { preferences } = await initial.json();

  try {
    const bogotaOffset = 5 * 3600_000;
    const estimated = new Date(
      Date.parse(departureAt) + 20 * 60_000 - bogotaOffset,
    )
      .toISOString()
      .slice(0, 16)
      .replace('T', ' ');
    await page.goto('/my-trips');
    const ownedTrip = page.getByTestId(`driver-trip-${id}`);
    await ownedTrip.getByRole('button', { name: 'Informar demora' }).click();
    await ownedTrip
      .getByLabel('Nueva salida estimada en Colombia')
      .fill(estimated);
    const update = page.waitForResponse((receipt) =>
      receipt.url().endsWith(`/trips/${id}/delay`),
    );
    await ownedTrip.getByRole('button', { name: 'Guardar demora' }).click();
    expect((await update).ok()).toBe(true);

    await page.goto('/');
    await expect(
      page.getByText('Salida programada ·', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText('Nueva salida estimada ·', { exact: false }),
    ).toBeVisible();

    await page.goto('/trip/' + id);
    const summary = page.getByTestId('trip-detail-summary');
    await expect(
      summary.getByText('Salida programada ·', { exact: false }),
    ).toBeVisible();
    await expect(
      summary.getByText('Nueva salida estimada ·', { exact: false }),
    ).toBeVisible();

    await page.goto('/');
    await page
      .getByRole('link', { name: 'Agenda de viajes', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Agenda de viajes' }),
    ).toBeVisible();
    await expect(
      page.getByText('Retraso · Salida estimada', { exact: false }),
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
    const booked = await joined.json();
    expect(booked.departureAt).toBe(departureAt);
    expect(booked.estimatedDepartureAt).toBe(
      new Date(estimated.replace(' ', 'T') + ':00-05:00').toISOString(),
    );
    await expect(
      page.getByText('Pendientes en otras paradas · 1', { exact: true }),
    ).toBeVisible({ timeout: 8000 });

    const inbox = await request.get(api + '/notifications', { headers: auth });
    expect(inbox.ok()).toBe(true);
    const { items } = (await inbox.json()) as NotificationPage;
    const notice = items.find(
      ({ kind, tripId }) => kind === 'PARTICIPATION_CONFIRMED' && tripId === id,
    );
    if (!notice) throw new Error('No se registró el aviso de participación');
    const link = `/open/notice/${notice.id}`;
    await page.goto(link);
    await expect(
      page.getByText('Este aviso ya no está disponible para tu cuenta.'),
    ).toBeVisible();

    const guest = await browser.newContext({ baseURL });
    try {
      const passengerPage = await guest.newPage();
      await passengerPage.goto(link);
      await expect(
        passengerPage.getByText(
          'Inicia sesión para abrir el enlace de RuTeam.',
        ),
      ).toBeVisible();
      await passengerPage
        .getByLabel('Correo institucional', { exact: true })
        .fill('ana@student-fixtures.ruteam.invalid');
      await passengerPage
        .getByLabel('Contraseña', { exact: true })
        .fill(password);
      await expectSuccessfulLogin(passengerPage);
      await expect(passengerPage).toHaveURL(
        new RegExp(`/trip-operation/${id}$`),
      );
      await expect(
        passengerPage.getByText('Salida programada', { exact: false }),
      ).toBeVisible();
    } finally {
      await guest.close();
    }

    await page.goto('/notification-settings');
    await expect(
      page.getByRole('button', { name: 'Activar avisos en este dispositivo' }),
    ).toHaveCount(0);
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
