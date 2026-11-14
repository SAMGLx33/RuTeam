import { expect, test } from '@playwright/test';
import { PrismaClient } from '../../apps/api/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomInt } from 'node:crypto';
test('registra vehículo, admin revisa y conductor publica hacia USC con dos recogidas', async ({
  page,
  browser,
}, testInfo) => {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }),
  });
  const plate = `Q${String.fromCharCode(65 + randomInt(26))}${String.fromCharCode(65 + randomInt(26))}${randomInt(100, 1000)}`;
  let vehicleId: string | undefined, tripId: string | undefined;
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
      .getByRole('link', { name: 'Publicar viaje hacia USC', exact: true })
      .click();
    await page
      .getByRole('radio', { name: `Vehículo ${plate}`, exact: true })
      .click();
    await page
      .getByLabel('Nombre del origen DEMO')
      .fill(`Origen E2E ${testInfo.project.name}`);
    await page
      .getByLabel('Salida Colombia (AAAA-MM-DD HH:mm)')
      .fill('2020-01-01 10:00');
    await page
      .getByRole('button', { name: 'Publicar viaje DEMO', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText('30 minutos');
    await page.getByLabel('Latitud del origen DEMO').fill('');
    await page
      .getByRole('button', { name: 'Publicar viaje DEMO', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText(
      'Completa todas las coordenadas',
    );
    await page.getByLabel('Latitud del origen DEMO').fill('3.43');
    const date = new Date(
      Date.now() +
        (testInfo.project.name === 'desktop' ? 10 : 11) * 86400000 -
        5 * 3600000,
    )
      .toISOString()
      .slice(0, 16)
      .replace('T', ' ');
    await page.getByLabel('Salida Colombia (AAAA-MM-DD HH:mm)').fill(date);
    await page.getByRole('button', { name: 'Añadir recogida' }).click();
    await page.getByLabel('Nombre de recogida 1').fill('Recogida Alfa DEMO');
    await page.getByLabel('Nombre de recogida 2').fill('Recogida Beta DEMO');
    const published = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/trips') &&
        response.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Publicar viaje DEMO', exact: true })
      .click();
    const response = await published;
    expect(response.status()).toBe(201);
    tripId = (await response.json()).id;
    await expect(
      page.getByText('Viaje publicado en PostgreSQL: PROGRAMADO · DISPONIBLE.'),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Ver mis viajes publicados' }).click();
    await page.reload();
    await expect(
      page.getByText(`Origen E2E ${testInfo.project.name}`, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText('1. Recogida Alfa DEMO', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText('2. Recogida Beta DEMO', { exact: false }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/ruteam-phase2-${testInfo.project.name}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    if (tripId) await db.trip.deleteMany({ where: { id: tripId } });
    if (vehicleId) await db.vehicle.deleteMany({ where: { id: vehicleId } });
    await db.$disconnect();
  }
});
