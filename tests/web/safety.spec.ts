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
  let contactId: string | undefined;
  const errors: string[] = [];
  const locationWrites: string[] = [];
  const tileRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    // Track the private safety view. The city overview on Home loads public tiles.
    if (
      request.url().startsWith('https://tiles.ruteam.invalid/') &&
      new URL(request.frame().url()).pathname.startsWith('/safety/')
    )
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

    await page.goto('/profile');
    await page.getByRole('button', { name: 'Añadir contacto' }).click();
    await page
      .getByLabel('Nombre o alias', { exact: true })
      .fill('Contacto sintético QA');
    await page.getByLabel('Teléfono', { exact: true }).fill('+573000000001');
    const contact = page.waitForResponse(
      (response) =>
        response.url().endsWith('/me/emergency-contacts') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Guardar contacto' }).click();
    const savedContact = await contact;
    expect(savedContact.status()).toBe(201);
    contactId = (await savedContact.json()).id as string;
    await expect(page.getByText(/Contacto sintético QA ·/)).toBeVisible();

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
    await page.context().setGeolocation({
      latitude: 3.40391,
      longitude: -76.54879,
      accuracy: 14,
    });
    await expect(
      page.getByText('No hay una ubicación reciente compartida.'),
    ).toBeVisible();
    expect(locationWrites).toEqual([]);
    const posted = page.waitForResponse(
      (response) =>
        response.url().endsWith('/location') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Activar compartición' }).click();
    expect((await posted).status()).toBe(204);
    await expect(page.getByText(/Última ubicación aproximada/)).toBeVisible();
    await expect(page.getByText('Precisión estimada · 14 m')).toBeVisible();
    await page.getByRole('button', { name: 'Pausar compartición' }).click();
    await expect(page.getByText(/Compartición pausada/)).toBeVisible();
    await page.context().setGeolocation({
      latitude: 3.45,
      longitude: -76.52,
      accuracy: 350,
    });
    await page.getByRole('button', { name: 'Reanudar compartición' }).click();
    await expect(page.getByText('Compartición activa.')).toBeVisible();
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
    await expect(page.getByText('Precisión estimada · 350 m')).toBeVisible({
      timeout: 20000,
    });
    await expect(
      page.getByText(/La precisión es insuficiente para dibujar un punto/),
    ).toBeVisible();
    await expect(locationMap).toHaveCount(0);
    expect(locationWrites).toEqual(['POST', 'POST']);
    await page
      .getByRole('button', { name: 'Detener y quitar ubicación' })
      .click();
    await expect(
      page.getByText('No hay una ubicación reciente compartida.'),
    ).toBeVisible();
    await expect(locationMap).toHaveCount(0);

    await page.goto(`/chat/${tripId}`);
    let messageWrites = 0;
    await page.route('**/chat/messages', async (route) => {
      messageWrites++;
      const accepted = await route.fetch();
      expect(accepted.status()).toBe(201);
      await route.abort('connectionreset');
    });
    const messageField = page.getByLabel('Mensaje', { exact: true });
    await messageField.fill('Mensaje confirmado tras recuperar la lectura');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(
      page.getByText('Envío confirmado después de consultar la conversación.'),
    ).toBeVisible();
    await expect(messageField).toHaveValue('');
    expect(messageWrites).toBe(1);
    await page.goBack();

    await page
      .getByRole('button', { name: 'Contactar a Contacto sintético QA' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Confirmar y abrir marcador' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Volver a mis contactos' }).click();
    await page
      .getByRole('link', { name: 'Registrar incidencia privada' })
      .click();
    await page.getByRole('radio', { name: 'Seguridad vial' }).click();
    await page
      .getByLabel('Descripción de la incidencia')
      .fill('Incidencia privada sintética de navegación');
    await page
      .getByRole('button', { name: 'Guardar registro privado' })
      .click();
    await expect(
      page.getByText('Incidencia guardada en tu historial privado.'),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText('Incidencia privada sintética de navegación'),
    ).toBeVisible();
    await page.screenshot({
      path: join(evidence, 'private-incident.jpg'),
      fullPage: true,
    });

    expect(errors).toEqual([]);
  } finally {
    if (contactId)
      await db.emergencyContact.deleteMany({ where: { id: contactId } });
    if (tripId) {
      await db.tripIncident.deleteMany({ where: { tripId } });
      await db.trip.delete({ where: { id: tripId } });
    }
    await db.$disconnect();
  }
});
