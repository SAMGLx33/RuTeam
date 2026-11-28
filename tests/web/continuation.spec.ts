import { expect, test } from '@playwright/test';
import { expectSuccessfulLogin } from './support/fixture-login';

const apiUrl = 'http://localhost:3100/api/v1';
const webHeaders = {
  'x-ruteam-client': 'web',
  Origin: 'http://localhost:8082',
};

test('el conductor gestiona una recurrencia y abre sus historiales desde la navegación', async ({
  page,
}, info) => {
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (!password) throw new Error('Configura la contraseña del fixture');
  await page.goto('/');
  await page
    .getByLabel('Correo institucional', { exact: true })
    .fill('diego@student-fixtures.ruteam.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await expectSuccessfulLogin(page);
  await expect(
    page.getByRole('heading', { name: 'Inicio', exact: true }),
  ).toBeVisible();

  const [campuses, vehicles] = await Promise.all([
    page.request.get(apiUrl + '/campus/publication-point', {
      headers: webHeaders,
    }),
    page.request.get(apiUrl + '/vehicles', { headers: webHeaders }),
  ]);
  expect(campuses.ok()).toBe(true);
  expect(vehicles.ok()).toBe(true);
  const campus = await campuses.json();
  expect(campus).toBeDefined();
  const vehicle = (await vehicles.json())[0];
  const date = new Date(Date.now() + 60 * 86400000);
  const name = 'Recorrido verificable ' + info.project.name + ' ' + Date.now();
  const calendarDate = date.toISOString().slice(0, 10);
  const created = await page.request.post(apiUrl + '/trip-schedules', {
    headers: webHeaders,
    data: {
      name,
      startsOn: calendarDate,
      endsOn: calendarDate,
      time: '17:35',
      weekdays: [date.getUTCDay() || 7],
      template: {
        vehicleId: vehicle.id,
        estimatedDurationMinutes: 45,
        offeredSeats: 1,
        ruleIds: [],
        itinerary: {
          direction: 'DESDE_USC',
          description: 'Recorrido recurrente de prueba',
          publicMeetingPoints: true,
          stops: [],
          origin: { campusPointId: campus.id, label: 'Entrada de prueba' },
          destination: {
            label: 'Destino público',
            latitude: 3.45,
            longitude: -76.51,
            instructions: 'Encuentro señalizado',
          },
        },
      },
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();

  try {
    await page
      .getByRole('link', { name: 'Viajes recurrentes', exact: true })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Viajes recurrentes', exact: true }),
    ).toBeVisible();
    const card = page.getByTestId(`recurring-schedule-${id}`);
    const scheduleStatus = (state: string) =>
      card
        .getByText(new RegExp(`^${state} · [^·]+ · 18:15 Colombia$`))
        .filter({ visible: true })
        .first();
    await card
      .getByRole('link', { name: 'Editar futuras publicaciones' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Editar recurrencia' }),
    ).toBeVisible();
    await expect(page.getByLabel('Nombre de la recurrencia')).toHaveValue(name);
    await page.getByRole('button', { name: /Hora de salida/ }).click();
    await page.getByRole('button', { name: 'Horas 18', exact: true }).click();
    await page.getByRole('button', { name: 'Minutos 15', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar hora' }).click();
    await page
      .getByRole('button', { name: 'Usar itinerario declarado' })
      .click();
    await page.getByRole('checkbox', { name: /Confirmo que la ruta/ }).click();
    await page.getByRole('button', { name: 'Guardar recurrencia' }).click();
    await expect(page.getByText(/Recurrencia guardada/)).toBeVisible();
    await page
      .getByRole('link', { name: 'Inicio', exact: true })
      .first()
      .click();
    await page
      .getByRole('link', { name: 'Viajes recurrentes', exact: true })
      .first()
      .click();
    await expect(scheduleStatus('Activa')).toBeVisible();
    await card
      .getByRole('button', { name: 'Pausar recurrencia', exact: true })
      .click();
    await expect(scheduleStatus('Pausada')).toBeVisible();
    await card
      .getByRole('button', { name: 'Reactivar recurrencia', exact: true })
      .click();
    await expect(scheduleStatus('Activa')).toBeVisible();
    await card
      .getByRole('button', { name: 'Cancelar recurrencia', exact: true })
      .click();
    await card
      .getByRole('button', { name: 'Detener solo la generación', exact: true })
      .click();
    await expect(scheduleStatus('Cancelada')).toBeVisible();

    await page
      .getByRole('link', { name: 'Perfil', exact: true })
      .first()
      .click();
    await page
      .getByRole('link', { name: 'Estadísticas de movilidad', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Mis estadísticas de movilidad' }),
    ).toBeVisible();
    await expect(page.getByText('Estimaciones ambientales')).toBeVisible();
    await page
      .getByRole('link', { name: 'Perfil', exact: true })
      .first()
      .click();
    await page
      .getByRole('link', { name: 'Historial económico', exact: true })
      .click();
    await page.getByRole('radio', { name: 'Como conductor' }).click();
    await expect(
      page.getByText(/Gastos estimados de \d+ viajes/),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Perfil', exact: true })
      .first()
      .click();
    await page
      .getByRole('link', { name: 'Mis incidencias', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Mis incidencias' }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Perfil', exact: true })
      .first()
      .click();
    await page
      .getByRole('link', { name: 'Configuración · Cuenta y privacidad' })
      .click();
    await expect(
      page.getByText('Sesiones activas', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/^Este dispositivo/)).toBeVisible();
  } finally {
    await page.request.post(apiUrl + '/trip-schedules/' + id + '/action', {
      headers: webHeaders,
      data: { action: 'CANCEL' },
    });
  }
});
