import { expect, test } from '@playwright/test';
import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomInt } from 'node:crypto';
test('revisión, viaje desde USC y reserva aceptada en dos sesiones', async ({
  page,
  browser,
}, testInfo) => {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }),
  });
  const plate = `Q${String.fromCharCode(65 + randomInt(26))}${String.fromCharCode(65 + randomInt(26))}${randomInt(100, 1000)}`;
  let vehicleId: string | undefined, tripId: string | undefined;
  const destination = `Floralia DEMO ${testInfo.project.name}`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/');
    await page.getByRole('radio', { name: /Diego/ }).click();
    await page.getByRole('button', { name: 'Entrar a la demo' }).click();
    await page.getByRole('link', { name: 'Vehículos y licencia DEMO' }).click();
    await page.getByLabel('Placa sintética').fill(plate);
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
      page.getByText('Vehículo DEMO registrado; revisión pendiente.'),
    ).toBeVisible();
    const context = await browser.newContext();
    try {
      const admin = await context.newPage();
      await admin.goto('http://localhost:8082');
      await admin.getByRole('radio', { name: /Administración/ }).click();
      await admin.getByRole('button', { name: 'Entrar a la demo' }).click();
      await admin
        .getByRole('link', { name: 'Revisar documentos DEMO' })
        .click();
      const approve = admin.getByRole('button', {
        name: `Aprobar SOAT ${plate}`,
        exact: true,
      });
      await approve.click();
      await expect(approve).toHaveCount(0);
    } finally {
      await context.close();
    }
    await page.getByRole('link', { name: 'Volver al perfil' }).click();
    await page
      .getByRole('link', { name: 'Publicar viaje', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Publicar viaje' }),
    ).toBeVisible();
    await page
      .getByRole('radio', { name: new RegExp(`Vehículo ${plate}`) })
      .click();
    await page
      .getByRole('radio', { name: /Origen · Plazoleta de los Sabios/ })
      .click();
    await page.getByLabel('Nombre público · Destino').fill(destination);
    await page.getByLabel('Latitud · Destino').fill('3.469');
    await page.getByLabel('Longitud · Destino').fill('-76.505');
    await page
      .getByLabel('Instrucciones · Destino')
      .fill('Esperar en el encuentro público DEMO');
    await page
      .getByLabel('Vías y referencias del recorrido')
      .fill('Ejemplo sintético, pasando por Calle Quinta');
    if (!process.env.ROUTING_BASE_URL) {
      await expect(
        page.getByRole('button', { name: 'Consultar rutas viales' }),
      ).toBeDisabled();
      await page
        .getByRole('checkbox', { name: /Autorizo enviar las coordenadas/ })
        .click();
      await page
        .getByRole('button', { name: 'Consultar rutas viales' })
        .click();
      await expect(page.getByRole('alert')).toContainText(
        'Motor vial sin configurar',
      );
    }
    await page
      .getByLabel('Salida Colombia (AAAA-MM-DD HH:mm)')
      .fill('2020-01-01 10:00');
    const review = page.getByRole('button', {
      name: 'Revisar viaje',
      exact: true,
    });
    const publish = page.getByRole('button', {
      name: 'Publicar viaje DEMO',
      exact: true,
    });
    const consent = page.getByRole('checkbox', {
      name: /Confirmo que la ruta/,
    });
    await review.click();
    await consent.click();
    await publish.click();
    await expect(page.getByRole('alert')).toContainText('30 minutos');
    await page
      .getByRole('button', { name: 'Editar antes de publicar' })
      .click();
    await page.getByLabel('Latitud · Destino').fill('');
    await review.click();
    await expect(page.getByText(/Completa las coordenadas/)).toBeVisible();
    await page.getByLabel('Latitud · Destino').fill('3.469');
    const date = new Date(
      Date.now() +
        (testInfo.project.name === 'desktop' ? 10 : 11) * 86400000 -
        5 * 3600000,
    )
      .toISOString()
      .slice(0, 16)
      .replace('T', ' ');
    await page.getByLabel('Salida Colombia (AAAA-MM-DD HH:mm)').fill(date);
    for (const index of [1, 2]) {
      await page.getByRole('button', { name: 'Añadir parada' }).click();
      await page
        .getByLabel(`Nombre público · Parada ${index}`)
        .fill(`Parada ${index} DEMO`);
      await page
        .getByLabel(`Latitud · Parada ${index}`)
        .fill(index === 1 ? '3.421' : '3.45');
      await page
        .getByLabel(`Longitud · Parada ${index}`)
        .fill(index === 1 ? '-76.543' : '-76.52');
      await page
        .getByLabel(`Instrucciones · Parada ${index}`)
        .fill('Junto al letrero DEMO');
    }
    await page.getByRole('radio', { name: 'Sólo paso · Parada 2' }).click();
    await page.getByLabel('Geometría LineString GeoJSON (opcional)').fill(
      JSON.stringify({
        type: 'LineString',
        coordinates: [
          [-76.54875, 3.4037],
          [-76.543, 3.421],
          [-76.52, 3.45],
          [-76.505, 3.469],
        ],
      }),
    );
    await review.click();
    await expect(page.getByText('Resumen para publicar')).toBeVisible();
    await expect(
      page.getByLabel(/Vista geográfica de la geometría/),
    ).toBeVisible();
    await consent.click();
    const published = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/trips') &&
        response.request().method() === 'POST',
    );
    await publish.click();
    const response = await published;
    expect(response.status()).toBe(201);
    tripId = (await response.json()).id;
    await expect(
      page.getByText('Viaje publicado en PostgreSQL: PROGRAMADO · DISPONIBLE.'),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Ver mis viajes publicados' }).click();
    await page.reload();
    await expect(page.getByText(destination, { exact: false })).toBeVisible();

    const passengerContext = await browser.newContext({
      viewport: page.viewportSize(),
    });
    try {
      const passenger = await passengerContext.newPage();
      passenger.on('pageerror', (error) => errors.push(error.message));
      await passenger.goto('http://localhost:8082');
      await passenger.getByRole('radio', { name: /Ana/ }).click();
      await passenger.getByRole('button', { name: 'Entrar a la demo' }).click();
      await passenger.getByRole('link', { name: 'Buscar viajes' }).click();
      await passenger.getByLabel('Origen deseado').fill('USC');
      await passenger.getByLabel('Destino deseado').fill('3.469,-76.505');
      await passenger.getByLabel('Radio de búsqueda (km)').fill('0.2');
      await passenger
        .getByRole('button', { name: 'Buscar viajes disponibles' })
        .click();
      await expect(
        passenger.getByText(destination, { exact: false }),
      ).toBeVisible();
      await passenger
        .getByRole('button', { name: 'Ver recorrido y reservar' })
        .click();
      await expect(
        passenger.getByText('3. Parada 2 DEMO · Sólo paso'),
      ).toBeVisible();
      await expect(
        passenger.getByRole('radio', { name: 'Abordaje · Parada 2 DEMO' }),
      ).toHaveCount(0);
      await passenger
        .getByRole('radio', { name: 'Abordaje · Parada 1 DEMO' })
        .click();
      await passenger
        .getByLabel(/Vista geográfica de la geometría/)
        .screenshot({
          path: `/tmp/ruteam-route-geometry-${testInfo.project.name}.png`,
        });
      await passenger.screenshot({
        path: `/tmp/ruteam-driver-routes-${testInfo.project.name}.png`,
        fullPage: true,
      });
      await passenger
        .getByRole('button', { name: 'Solicitar cupo', exact: true })
        .click();
      await expect(
        passenger.getByText('Solicitud enviada. El conductor debe decidir.'),
      ).toBeVisible();

      await page
        .getByRole('button', { name: 'Ver recorrido y solicitudes' })
        .click();
      await page.getByRole('button', { name: 'Aceptar solicitud' }).click();
      await expect(
        page.getByText('Confirmada · Viaje PROGRAMADO'),
      ).toBeVisible();
      await passenger.getByRole('link', { name: 'Ver mis reservas' }).click();
      await expect(
        passenger.getByText('Confirmada · Viaje PROGRAMADO'),
      ).toBeVisible();
    } finally {
      await passengerContext.close();
    }
    expect(errors).toEqual([]);
  } finally {
    if (tripId) {
      await db.reservation.deleteMany({ where: { tripId } });
      await db.trip.deleteMany({ where: { id: tripId } });
    }
    if (vehicleId) await db.vehicle.deleteMany({ where: { id: vehicleId } });
    await db.$disconnect();
  }
});
