import {
  expectSuccessfulLogin,
  submitFixtureLogin,
} from './support/fixture-login';
import { expect, test, type Page } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../backend/src/generated/prisma/client';

const apiUrl =
  process.env.RUTEAM_TEST_API_URL ?? 'http://localhost:3100/api/v1';
const testHeaders = { 'x-ruteam-client': 'native' };

async function signIn(page: Page, actor: 'ana' | 'sara', password: string) {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Correo institucional' })
    .fill(actor + '@student-fixtures.ruteam.invalid');
  await page.locator('input[aria-label="Contraseña"]:visible').fill(password);
  await expectSuccessfulLogin(page);
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }),
  ).toBeVisible();
}

test('invitar, consentir y confirmar en dos sesiones libera el acceso a las plazas individuales', async ({
  page,
  browser,
  request,
  baseURL,
}, info) => {
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (
    !password ||
    !databaseUrl ||
    databaseUrl === process.env.DATABASE_URL ||
    !new URL(databaseUrl).pathname.endsWith('_test')
  )
    throw new Error(
      'Este recorrido requiere fixtures en una base _test independiente',
    );

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  const guestContext = await browser.newContext({
    viewport: page.viewportSize() ?? undefined,
    baseURL,
  });
  const guest = await guestContext.newPage();
  let tripId: string | undefined;
  try {
    const [login, campus, vehicle] = await Promise.all([
      submitFixtureLogin(() =>
        request.post(apiUrl + '/auth/login', {
          headers: testHeaders,
          data: { email: 'diego@student-fixtures.ruteam.invalid', password },
        }),
      ),
      db.campusDestination.findUniqueOrThrow({
        where: { code: 'USC-DEMO-ENTRADA' },
      }),
      db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } }),
    ]);
    expect(login.status()).toBe(200);
    const { token } = (await login.json()) as { token: string };
    const created = await request.post(apiUrl + '/trips', {
      headers: { ...testHeaders, Authorization: 'Bearer ' + token },
      data: {
        departureAt: new Date(Date.now() + 55 * 3600000).toISOString(),
        estimatedDurationMinutes: 20,
        vehicleId: vehicle.id,
        offeredSeats: 2,
        ruleIds: [],
        itinerary: {
          description: 'Trayecto de grupos para Playwright',
          publicMeetingPoints: true,
          origin: {
            campusPointId: campus.id,
            label: 'Entrada USC para grupos',
          },
          destination: {
            label: 'Destino público de grupos',
            latitude: 3.43,
            longitude: -76.515,
            instructions: 'Junto al acceso público',
          },
          stops: [],
        },
      },
    });
    const published = (await created.json()) as { id?: string };
    tripId = published.id;
    expect(created.status()).toBe(201);
    expect(tripId).toBeTruthy();

    await Promise.all([
      signIn(page, 'ana', password),
      signIn(guest, 'sara', password),
    ]);
    await page.goto('/trip/' + tripId);
    await expect(
      page.getByRole('heading', { name: 'Detalle del viaje' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Viajar con un grupo' }).click();
    await page
      .getByRole('button', { name: 'Consentir y crear invitación' })
      .click();
    const code = await page
      .getByLabel('Código de invitación generado')
      .textContent();
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    if (!code) throw new Error('La invitación no se mostró');
    await page.getByRole('link', { name: 'Ver mis grupos' }).click();
    await expect(
      page.getByRole('button', { name: 'Confirmar todas las plazas' }),
    ).toBeDisabled();
    expect(await db.reservation.count({ where: { tripId } })).toBe(0);

    await guest.goto('/my-reservations');
    await guest.getByRole('link', { name: 'Mis grupos', exact: true }).click();
    await guest
      .getByRole('textbox', { name: 'Código de invitación' })
      .fill(code);
    await guest.getByRole('button', { name: 'Consultar invitación' }).click();
    await expect(
      guest.getByRole('heading', {
        name: 'Entrada USC para grupos → Destino público de grupos',
      }),
    ).toBeVisible();
    await guest
      .getByRole('button', { name: 'Aceptar condiciones del grupo' })
      .click();
    await expect(guest.getByText('Consentimiento registrado.')).toBeVisible();
    expect(await db.reservation.count({ where: { tripId } })).toBe(0);

    await page.reload();
    await expect(page.getByText('2 de 2 consentimientos')).toBeVisible();
    await page
      .getByRole('button', { name: 'Confirmar todas las plazas' })
      .click();
    await expect(
      page.getByText('Grupo confirmado', { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('grupo-confirmado.png') });
    await guest.reload();
    await guest.getByRole('link', { name: 'Consultar mi plaza' }).click();
    await expect(
      guest.getByText('En espera de recogida · Viaje programado', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      db.reservation.count({
        where: { tripId, quantity: 1, status: 'CONFIRMED' },
      }),
    ).resolves.toBe(2);
  } finally {
    await guestContext.close();
    if (tripId) {
      await db.tripGroup.deleteMany({ where: { tripId } });
      await db.reservation.deleteMany({ where: { tripId } });
      await db.trip.deleteMany({ where: { id: tripId } });
    }
    await db.$disconnect();
  }
});
