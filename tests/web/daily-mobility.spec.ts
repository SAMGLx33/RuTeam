import { expect, test } from '@playwright/test';
import type {
  CampusMeetingPoint,
  FrequentPlaceView,
  TripSummary,
  VehicleSummary,
} from '../../packages/contracts/src/index';
import {
  expectSuccessfulLogin,
  submitFixtureLogin,
} from './support/fixture-login';

const api = 'http://localhost:3100/api/v1';
const web = { Origin: 'http://localhost:8082', 'x-ruteam-client': 'web' };

test('detalle guarda un viaje y lugares privados se reutilizan al buscar', async ({
  page,
  request,
}, testInfo) => {
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (!password) throw new Error('La cuenta sintética necesita su contraseña');
  const login = await submitFixtureLogin(() =>
    request.post(api + '/auth/login', {
      headers: { 'x-ruteam-client': 'native' },
      data: { email: 'diego@student-fixtures.ruteam.invalid', password },
    }),
  );
  expect(login.status()).toBe(200);
  const headers = {
    'x-ruteam-client': 'native',
    Authorization: 'Bearer ' + (await login.json()).token,
  };
  const [points, vehicles] = await Promise.all([
    request.get(api + '/campus/meeting-points', { headers }),
    request.get(api + '/vehicles', { headers }),
  ]);
  const campus = ((await points.json()) as CampusMeetingPoint[]).find(
    ({ kind }) => kind === 'PLAZA',
  );
  const vehicle = ((await vehicles.json()) as VehicleSummary[]).find(
    ({ plate }) => plate === 'STU123',
  );
  if (!campus || !vehicle)
    throw new Error('Faltan el campus o el vehículo sintéticos');
  const published = await request.post(api + '/trips', {
    headers,
    data: {
      vehicleId: vehicle.id,
      departureAt: new Date(Date.now() + 34 * 3600_000).toISOString(),
      estimatedDurationMinutes: 35,
      offeredSeats: 1,
      ruleIds: [],
      itinerary: {
        direction: 'DESDE_USC',
        publicMeetingPoints: true,
        description: 'Ruta de prueba de guardados',
        origin: { campusPointId: campus.id, label: 'Punto institucional' },
        destination: {
          label: 'Parque de prueba',
          latitude: 3.45,
          longitude: -76.51,
          instructions: 'Lugar público',
        },
        stops: [],
      },
    },
  });
  expect(published.status()).toBe(201);
  const trip = (await published.json()) as TripSummary;
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  let place: FrequentPlaceView | undefined;
  let booking: { id: string; auth: Record<string, string> } | undefined;
  const tripLink = `/trip/${trip.id}`;
  try {
    await page.goto('/');
    await page
      .getByLabel('Correo institucional', { exact: true })
      .fill('sara@student-fixtures.ruteam.invalid');
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await expectSuccessfulLogin(page);
    await page.goto('/trip/' + trip.id);
    await expect(
      page.getByRole('heading', { name: 'Detalle del viaje', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Guardar viaje', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Quitar de guardados' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Mis viajes guardados' }).click();
    await expect(page).toHaveURL(/\/saved-trips$/);
    await expect(page.getByText('Con plazas disponibles · 1')).toBeVisible();
    await page.screenshot({
      path: `/tmp/ruteam-daily-saved-${testInfo.project.name}.png`,
    });
    await page.reload();
    await expect(page.locator(`a[href="${tripLink}"]`)).toBeVisible();

    await page.goto('/');
    await page
      .getByRole('link', { name: 'Viajes guardados · 1', exact: true })
      .click();
    await expect(page).toHaveURL(/\/saved-trips$/);

    await page.goto('/available-trips');
    await page.getByRole('tab', { name: 'Todos', exact: true }).click();
    const card = page.locator(`a[href="${tripLink}"]`).locator('..');
    await expect(card.getByText('Guardado', { exact: true })).toBeVisible();

    const bookingLogin = await submitFixtureLogin(() =>
      request.post(api + '/auth/login', {
        headers: { 'x-ruteam-client': 'native' },
        data: { email: 'ana@student-fixtures.ruteam.invalid', password },
      }),
    );
    expect(bookingLogin.ok()).toBe(true);
    const auth = {
      'x-ruteam-client': 'native',
      Authorization: 'Bearer ' + (await bookingLogin.json()).token,
    };
    const pickupId = trip.itinerary?.stops[0].id;
    const dropoffId = trip.itinerary?.stops.at(-1)?.id;
    const booked = await request.post(
      api + '/trips/' + trip.id + '/participations',
      {
        headers: auth,
        data: { pickupId, dropoffId },
      },
    );
    expect(booked.status()).toBe(201);
    booking = { id: (await booked.json()).id, auth };

    await page.goto('/saved-trips');
    await expect(
      page.getByText('Sin plazas disponibles', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Avisarme si se libera una plaza' })
      .click();
    const cancelAlert = page.getByRole('button', {
      name: 'Cancelar aviso de plaza',
    });
    await expect(cancelAlert).toBeVisible();
    await page.reload();
    await expect(cancelAlert).toBeVisible();
    await cancelAlert.click();
    await expect(
      page.getByRole('button', { name: 'Avisarme si se libera una plaza' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Quitar de guardados' }).click();
    await expect(page.locator(`a[href="${tripLink}"]`)).toHaveCount(0);

    const entered = await page.request.post(api + '/mobility/frequent-places', {
      headers: web,
      data: {
        name: 'Referencia habitual sintética',
        kind: 'PUBLIC_REFERENCE',
        placeLabel: 'Parque de prueba',
        latitude: 3.45,
        longitude: -76.51,
      },
    });
    expect(entered.status()).toBe(201);
    place = (await entered.json()) as FrequentPlaceView;
    await page.goto('/frequent-places');
    await expect(
      page.getByRole('heading', { name: 'Lugares habituales', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(place.name, { exact: true })).toBeVisible();
    await page.screenshot({
      path: `/tmp/ruteam-daily-places-${testInfo.project.name}.png`,
    });
    await page.goto('/search-trips');
    await page
      .getByRole('button', { name: 'Buscar cerca de un lugar en el mapa' })
      .click();
    await page.getByRole('button', { name: 'Usar un lugar habitual' }).click();
    await page.getByRole('button', { name: place.name, exact: true }).click();
    const search = page.waitForResponse(
      (res) =>
        res.url().includes('/trips/available?') &&
        new URL(res.url()).searchParams.has('near'),
    );
    await page
      .getByRole('button', { name: 'Buscar viajes disponibles' })
      .click();
    expect(new URL((await search).url()).searchParams.get('near')).toBe(
      '3.450000,-76.510000',
    );
    expect(errors).toEqual([]);
  } finally {
    if (booking)
      await request.post(api + '/participations/' + booking.id + '/cancel', {
        headers: booking.auth,
      });
    if (place)
      await page.request.delete(api + '/mobility/frequent-places/' + place.id, {
        headers: web,
      });
    await page.request.delete(api + '/mobility/saved-trips/' + trip.id, {
      headers: web,
    });
    await request.post(api + '/trips/' + trip.id + '/transition', {
      headers,
      data: { action: 'CANCEL' },
    });
  }
});
