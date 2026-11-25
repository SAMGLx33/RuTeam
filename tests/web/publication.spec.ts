import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomInt } from 'node:crypto';
async function selectMapPoint(page: Page, label: string, x: number, y: number) {
  const open = page.getByRole('button', { name: `Elegir en mapa · ${label}` });
  if (await open.isVisible()) await open.click();
  const map = page.getByRole('button', {
    name: `Mapa para seleccionar · ${label}`,
  });
  const bounds = await map.boundingBox();
  if (!bounds) throw new Error('El mapa no es visible');
  await map.click({ position: { x: bounds.width * x, y: bounds.height * y } });
  await expect(
    page.getByText(`Ubicación seleccionada · ${label}`),
  ).toBeVisible();
  await page.getByRole('button', { name: `Cerrar mapa · ${label}` }).click();
}

test('viaje desde USC y participación directa en dos sesiones', async ({
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
    await page.route('https://tiles.ruteam.invalid/**', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dcebea"/></svg>',
      }),
    );
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Abrir acceso de desarrollo' })
      .click();
    await page.getByRole('radio', { name: /Diego/ }).click();
    await page.getByRole('button', { name: 'Entrar en desarrollo' }).click();
    await page.getByRole('link', { name: 'Vehículos y licencia' }).click();
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
    await expect(page.getByLabel(/^(Latitud|Longitud|Geometría)/)).toHaveCount(
      0,
    );
    await selectMapPoint(page, 'Destino', 0.82, 0.2);
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
      name: 'Confirmar publicación',
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
    await page
      .getByLabel('Punto de encuentro libre · Origen')
      .fill('Sótano, junto a la escalera');
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
      await selectMapPoint(
        page,
        `Parada ${index}`,
        0.5 + index * 0.1,
        0.5 - index * 0.1,
      );
      await page
        .getByLabel(`Instrucciones · Parada ${index}`)
        .fill('Junto al letrero DEMO');
    }
    await page.getByRole('radio', { name: 'Sólo paso · Parada 2' }).click();
    // The HTTP provider is tested separately. This controlled response covers
    // selecting an alternative and persisting exactly the chosen geometry.
    await page.route('**/api/v1/trips/route-options', async (route) => {
      const origin = await db.campusDestination.findUniqueOrThrow({
        where: { code: 'USC-DEMO-SABIOS' },
      });
      const submitted = route.request().postDataJSON();
      const coordinates = [
        [Number(origin.longitude), Number(origin.latitude)],
        ...[...submitted.stops, submitted.destination].map(
          (point: { longitude: number; latitude: number }) => [
            point.longitude,
            point.latitude,
          ],
        ),
      ];
      await route.fulfill({
        json: [
          {
            geometry: { type: 'LineString', coordinates },
            distanceMeters: 5000,
            durationMinutes: 45,
          },
        ],
      });
    });
    await page
      .getByRole('checkbox', { name: /Autorizo enviar las coordenadas/ })
      .click();
    await page.getByRole('button', { name: 'Consultar rutas viales' }).click();
    await page.getByRole('button', { name: 'Elegir alternativa 1' }).click();
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
      page.getByText('Viaje publicado. Ya aparece en Mis viajes.'),
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
      await passenger
        .getByRole('button', { name: 'Abrir acceso de desarrollo' })
        .click();
      await passenger.getByRole('radio', { name: /Ana/ }).click();
      await passenger
        .getByRole('button', { name: 'Entrar en desarrollo' })
        .click();
      await passenger.getByRole('link', { name: 'Buscar viajes' }).click();
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
      await passenger
        .getByRole('radio', { name: 'Encuentro · Sótano, junto a la escalera' })
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
        .getByRole('button', { name: 'Confirmar participación', exact: true })
        .click();
      await expect(
        passenger.getByText(
          'Participación confirmada. Tu plaza ya está registrada.',
        ),
      ).toBeVisible();

      await expect(
        passenger.getByLabel('Códigos de acompañantes DEMO (opcional)'),
      ).toHaveCount(0);
      expect(
        await db.reservation.count({ where: { tripId, status: 'CONFIRMED' } }),
      ).toBe(1);
      expect(
        await db.reservation.count({ where: { tripId, status: 'PENDING' } }),
      ).toBe(0);
      expect(
        (await db.trip.findUniqueOrThrow({ where: { id: tripId } }))
          .occupiedSeats,
      ).toBe(1);
      await page
        .getByRole('button', { name: 'Ver recorrido y participantes' })
        .click();
      await expect(
        page.getByRole('button', { name: 'Aceptar solicitud' }),
      ).toHaveCount(0);
      await expect(
        page.getByText('Confirmada · Viaje programado'),
      ).toBeVisible();
      await passenger
        .getByRole('link', { name: 'Ver mis participaciones' })
        .click();
      await expect(
        passenger.getByText('Confirmada · Viaje programado'),
      ).toBeVisible();
      await passenger
        .getByRole('button', { name: 'Cancelar participación' })
        .click();
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
