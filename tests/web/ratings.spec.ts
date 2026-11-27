import { expectSuccessfulLogin } from './support/fixture-login';
import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../backend/src/generated/prisma/client';

const apiUrl = 'http://localhost:3100/api/v1';
const web = { 'x-ruteam-client': 'web', Origin: 'http://localhost:8082' };

async function login(page: Page, account: 'ana' | 'diego') {
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (!password) throw new Error('Se requiere password de fixtures de pruebas');
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Correo institucional' })
    .fill(`${account}@student-fixtures.ruteam.invalid`);
  await page.locator('input[aria-label="Contraseña"]:visible').fill(password);
  await expectSuccessfulLogin(page);
  await expect(
    page.getByRole('heading', { name: 'Inicio', exact: true }),
  ).toBeVisible();
}

test('finaliza un viaje, califica desde el aviso y actualiza el promedio persistido', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(90000);
  const connectionString = process.env.TEST_DATABASE_URL;
  if (
    !connectionString ||
    !new URL(connectionString).pathname.endsWith('_test')
  )
    throw new Error('BD de pruebas requerida');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const context = await browser.newContext({ viewport: page.viewportSize() });
  const passenger = await context.newPage();
  const errors: string[] = [];
  for (const tab of [page, passenger])
    tab.on('pageerror', (error) => errors.push(error.message));
  const ids: string[] = [];
  const destination = `Destino RF-010 ${info.project.name}`;
  const evidence = join(
    process.env.RUTEAM_EVIDENCE_DIR ?? '/tmp/ruteam-consolidation-evidence',
    'ratings',
    info.project.name,
  );
  try {
    await Promise.all([login(page, 'diego'), login(passenger, 'ana')]);
    const vehicle = await db.vehicle.findUniqueOrThrow({
      where: { plate: 'STU123' },
    });
    const campus = await db.campusDestination.findUniqueOrThrow({
      where: { code: 'USC-DEMO-SABIOS' },
    });
    const createTrip = async (hours: number, label: string) => {
      const response = await page.request.post(`${apiUrl}/trips`, {
        headers: web,
        data: {
          vehicleId: vehicle.id,
          offeredSeats: 1,
          ruleIds: [],
          estimatedDurationMinutes: 40,
          departureAt: new Date(Date.now() + hours * 3600000).toISOString(),
          itinerary: {
            direction: 'DESDE_USC',
            publicMeetingPoints: true,
            description: 'Recorrido de validación RF-010',
            origin: { campusPointId: campus.id },
            destination: {
              label,
              latitude: 3.447,
              longitude: -76.52,
              instructions: 'Referencia pública de prueba',
            },
            stops: [],
          },
        },
      });
      expect(response.status()).toBe(201);
      const trip = await response.json();
      ids.push(trip.id);
      return trip;
    };
    const trip = await createTrip(68, destination);
    const upcoming = await createTrip(
      70,
      `Próxima publicación ${info.project.name}`,
    );
    const participation = await passenger.request.post(
      `${apiUrl}/trips/${trip.id}/participations`,
      {
        headers: web,
        data: {
          pickupId: trip.itinerary.stops[0].id,
          dropoffId: trip.itinerary.stops.at(-1).id,
        },
      },
    );
    expect(participation.status()).toBe(201);
    await page.goto('/my-trips');
    const card = page.getByText(new RegExp(destination)).first().locator('..');
    await card
      .getByRole('link', { name: 'Costos estimados', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Combustible', exact: true })
      .fill('12001');
    await page
      .getByRole('textbox', { name: 'Peajes', exact: true })
      .fill('5000');
    await page
      .getByRole('button', { name: 'Guardar estimación', exact: true })
      .click();
    await expect(page.getByText(/Total guardado/)).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: 'Combustible', exact: true }),
    ).toHaveValue('12001');
    await page.goto('/my-trips');
    await card.getByRole('button', { name: 'Editar descripción' }).click();
    await card
      .getByRole('textbox', { name: 'Descripción del recorrido' })
      .fill('Recorrido actualizado en la prueba RF-010');
    await card.getByRole('button', { name: 'Guardar descripción' }).click();
    await expect(card.getByText('Cambio guardado.')).toBeVisible();
    await card
      .getByRole('button', { name: 'Iniciar viaje', exact: true })
      .click();
    await card
      .getByRole('button', {
        name: 'Ver recorrido y participantes',
        exact: true,
      })
      .click();
    await card
      .getByRole('button', { name: 'Confirmar abordaje', exact: true })
      .click();
    await expect(card.getByText(/A bordo/)).toBeVisible();
    await card
      .getByRole('button', { name: 'Finalizar viaje', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Finalizar sin registrar descensos' })
      .click();
    await expect(
      card.getByRole('link', { name: 'Calificar participantes' }),
    ).toBeVisible();
    await passenger.goto('/notifications');
    await expect(
      passenger.getByText('Hay un viaje que puedes calificar'),
    ).toBeVisible();
    await passenger
      .getByRole('link', { name: 'Ver calificaciones del viaje' })
      .click();
    await expect(
      passenger.getByRole('heading', { name: 'Calificaciones del viaje' }),
    ).toBeVisible();
    await mkdir(evidence, { recursive: true });
    await passenger.screenshot({
      path: join(evidence, 'pendiente.png'),
      fullPage: true,
    });
    await passenger.getByRole('radio', { name: '5 estrellas' }).click();
    await passenger
      .getByLabel('Comentario privado')
      .fill('Encuentro claro de prueba');
    await passenger
      .getByRole('button', { name: 'Revisar calificación' })
      .click();
    await passenger
      .getByRole('button', { name: 'Enviar calificación' })
      .click();
    await expect(
      passenger.getByText('Calificación enviada · 5 / 5'),
    ).toBeVisible();
    await passenger.reload();
    await expect(
      passenger.getByText('Calificación enviada · 5 / 5'),
    ).toBeVisible();
    await passenger.screenshot({
      path: join(evidence, 'enviada.png'),
      fullPage: true,
    });
    await passenger.goto(`/trip/${upcoming.id}`);
    await expect(
      passenger.getByText('Conducción · 5 / 5 (1 calificación)'),
    ).toBeVisible();
    await expect(passenger.getByText(/Encuentro claro de prueba/)).toHaveCount(
      0,
    );
    await passenger.screenshot({
      path: join(evidence, 'reputacion.png'),
      fullPage: true,
    });
    await expect
      .poll(() => db.tripRating.count({ where: { tripId: trip.id, stars: 5 } }))
      .toBe(1);
    expect(errors).toEqual([]);
  } finally {
    if (ids.length) {
      await db.reservation.deleteMany({ where: { tripId: { in: ids } } });
      await db.trip.deleteMany({ where: { id: { in: ids } } });
    }
    await context.close();
    await db.$disconnect();
  }
});
