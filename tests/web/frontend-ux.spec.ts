import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { expectSuccessfulLogin } from './support/fixture-login';

test('Inicio, mapa, navegación, contexto y apariencia mantienen el acceso convencional', async ({
  page,
}, info) => {
  const directory = `/tmp/ruteam-ux-qa/screens/${info.project.name}`;
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  const tileRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://tiles.ruteam.invalid/**', (route) => {
    tileRequests.push(new URL(route.request().url()).pathname);
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e5edf2"/></svg>',
    });
  });
  if (info.project.name === 'desktop')
    await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByText('Muévete con tu comunidad')).toBeVisible();
  const password = page.getByLabel('Contraseña', { exact: true });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(password).toHaveJSProperty('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await page.screenshot({ path: `${directory}/acceso.png` });
  await page
    .getByLabel('Correo institucional')
    .fill('diego@student-fixtures.ruteam.invalid');
  await password.fill(process.env.AUTH_FIXTURE_PASSWORD ?? '');
  await expectSuccessfulLogin(page);

  await expect(
    page.getByRole('heading', { name: 'Inicio', exact: true }),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', {
    name: 'Navegación principal',
  });
  for (const section of ['Inicio', 'Viajes', 'Actividad', 'Mensajes', 'Perfil'])
    await expect(
      navigation.getByRole('link', { name: section, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Publicar viaje', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Pasajero', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Buscar viaje' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Publicar viaje', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Mapa de movilidad RuTeam')).toBeVisible();
  await expect.poll(() => tileRequests.length).toBeGreaterThan(0);
  const before = new Set(tileRequests);
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await expect
    .poll(() => tileRequests.some((path) => !before.has(path)))
    .toBeTruthy();
  if (info.project.name === 'desktop') {
    const map = page.getByLabel('Mapa de movilidad RuTeam');
    const box = await map.boundingBox();
    if (!box) throw new Error('No se pudo medir el mapa');
    const cameraTiles = new Set(tileRequests);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.55, {
      steps: 8,
    });
    await page.mouse.up();
    await expect
      .poll(() => tileRequests.some((path) => !cameraTiles.has(path)))
      .toBeTruthy();
  }
  await page.getByRole('button', { name: 'Ajustar mapa al recorrido' }).click();
  await page.screenshot({ path: `${directory}/inicio.png` });
  if (info.project.name === 'mobile-web') {
    await page.getByRole('button', { name: 'Plegar Próximo viaje' }).click();
    await expect(
      page.getByRole('button', { name: 'Buscar viaje' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Expandir Próximo viaje' }).click();
    await expect(
      page.getByRole('button', { name: 'Buscar viaje' }),
    ).toBeVisible();
  }
  await page.getByRole('tab', { name: 'Conductor', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Publicar viaje', exact: true }),
  ).toBeVisible();
  await navigation.getByRole('link', { name: 'Perfil', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Perfil', exact: true }),
  ).toBeVisible();
  const dark = page.getByRole('button', { name: 'Oscuro', exact: true });
  await dark.click();
  await expect(dark).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(dark).toHaveAttribute('aria-pressed', 'true');
  await expect(navigation).toHaveCSS('background-color', 'rgb(20, 30, 48)');
  await page.screenshot({ path: `${directory}/perfil-oscuro.png` });
  await page.getByRole('button', { name: 'Claro', exact: true }).click();
  await navigation
    .getByRole('link', { name: 'Actividad', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Mis actividades', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Opcionales', exact: true }),
  ).toBeVisible();
  await navigation.getByRole('link', { name: 'Mensajes', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mensajes', exact: true }),
  ).toBeVisible();
  await navigation.getByRole('link', { name: 'Viajes', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Viajes disponibles', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mapa', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(navigation).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBeTruthy();
  }
  expect(errors).toEqual([]);
});
