import { expectSuccessfulLogin } from './support/fixture-login';
import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const api = process.env.RUTEAM_E2E_API_URL ?? 'http://localhost:3100/api/v1';
const headers = {
  'x-ruteam-client': 'web',
  Origin: process.env.RUTEAM_E2E_WEB_URL ?? 'http://localhost:8082',
};

test('seguridad del viaje activo comparte contexto, resuelve ubicación voluntaria y confirma el marcador', async ({
  page,
}, testInfo) => {
  const database = process.env.TEST_DATABASE_URL;
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (
    !database ||
    database === process.env.DATABASE_URL ||
    !new URL(database).pathname.endsWith('_test') ||
    !password
  )
    throw new Error(
      'La prueba de seguridad requiere fixtures en PostgreSQL de pruebas',
    );
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: database }),
  });
  let tripId: string | undefined;
  const errors: string[] = [];
  const locationWrites: string[] = [];
  const tileRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().startsWith('https://tiles.ruteam.invalid/'))
      tileRequests.push(request.url());
    if (request.url().endsWith('/location') && request.method() === 'POST')
      locationWrites.push(request.method());
  });
  try {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          document.body.dataset.sharedTrip = data.text;
        },
      });
    });
    await page.goto('/');
    await page
      .getByLabel('Correo institucional', { exact: true })
      .fill('diego@student-fixtures.ruteam.invalid');
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await expectSuccessfulLogin(page);
    await expect(
      page.getByRole('heading', { name: 'Inicio', exact: true }),
    ).toBeVisible();

    const vehicle = await db.vehicle.findUniqueOrThrow({
      where: { plate: 'STU123' },
    });
    const campus = await db.campusDestination.findUniqueOrThrow({
      where: { code: 'USC-DEMO-ENTRADA' },
    });
    const published = await page.request.post(`${api}/trips`, {
      headers,
      data: {
        vehicleId: vehicle.id,
        departureAt: new Date(Date.now() + 91 * 3600000).toISOString(),
        estimatedDurationMinutes: 40,
        offeredSeats: 1,
        ruleIds: [],
        itinerary: {
          direction: 'DESDE_USC',
          publicMeetingPoints: true,
          origin: { campusPointId: campus.id },
          destination: {
            label: 'Encuentro identificable sólo en RuTeam',
            latitude: 3.44,
            longitude: -76.52,
            instructions: 'Punto público de la prueba',
          },
          stops: [],
          description: 'Ruta del ensayo web',
        },
      },
    });
    expect(published.status()).toBe(201);
    tripId = (await published.json()).id as string;
    await db.trip.update({
      where: { id: tripId },
      data: {
        departureAt: new Date(Date.now() + 5 * 60000),
        expectedEndAt: new Date(Date.now() + 45 * 60000),
      },
    });
    const active = await page.request.post(
      `${api}/trips/${tripId}/transition`,
      {
        headers,
        data: { action: 'START' },
      },
    );
    expect(active.status()).toBe(200);
    await page.goto('/my-trips');
    await page
      .getByRole('link', { name: 'Seguridad del viaje', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Seguridad del viaje', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Próxima parada · Encuentro identificable sólo en RuTeam/),
    ).toBeVisible();
    await page.context().grantPermissions(['geolocation']);
    await page
      .context()
      .setGeolocation({ latitude: 3.40391, longitude: -76.54879 });
    await expect(
      page.getByText('No hay una ubicación reciente compartida.'),
    ).toBeVisible();
    expect(locationWrites).toEqual([]);
    const posted = page.waitForResponse(
      (response) =>
        response.url().endsWith('/location') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Compartir mi ubicación ahora' })
      .click();
    expect((await posted).status()).toBe(204);
    await expect(page.getByText(/Última ubicación aproximada/)).toBeVisible();
    const locationMap = page.getByLabel(
      'Vista esquemática de la última ubicación compartida y las paradas publicadas.',
    );
    await expect(locationMap).toBeVisible();
    expect(locationWrites).toEqual(['POST']);
    expect(tileRequests).toEqual([]);
    await page
      .getByRole('button', { name: 'Revisar resumen para compartir' })
      .click();
    await expect(
      page.getByText(/Viaje RuTeam en curso desde la USC/),
    ).toBeVisible();
    await expect(page.locator('body')).not.toHaveAttribute(
      'data-shared-trip',
      /.+/,
    );
    await page
      .getByRole('button', { name: 'Abrir selector del sistema' })
      .click();
    await expect(page.locator('body')).toHaveAttribute(
      'data-shared-trip',
      /^Viaje RuTeam en curso desde la USC/,
    );
    const message = await page.locator('body').getAttribute('data-shared-trip');
    expect(message).not.toContain('Encuentro identificable');
    expect(message).not.toContain(tripId);
    await page
      .getByRole('button', { name: 'Línea de emergencias 123' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Abrir marcador del 123' }),
    ).toBeVisible();
    const evidence = join(
      process.env.RUTEAM_SAFETY_EVIDENCE ?? '/tmp/ruteam-product-ux/safety',
      testInfo.project.name,
    );
    await mkdir(evidence, { recursive: true });
    await page.screenshot({
      path: join(evidence, 'safety.jpg'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Volver a seguridad' }).click();
    await expect(
      page.getByRole('button', { name: 'Abrir marcador del 123' }),
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Quitar ubicación compartida' })
      .click();
    await expect(
      page.getByText('No hay una ubicación reciente compartida.'),
    ).toBeVisible();
    await expect(locationMap).toHaveCount(0);

    expect(errors).toEqual([]);
  } finally {
    if (tripId) await db.trip.delete({ where: { id: tripId } });
    await db.$disconnect();
  }
});
