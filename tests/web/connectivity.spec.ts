import { expect, test } from '@playwright/test';
import { expectSuccessfulLogin } from './support/fixture-login';

test('la lectura se identifica como desactualizada, se recupera y limpia al revocar la sesión', async ({
  page,
}) => {
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (!password) throw new Error('Falta la clave de fixtures de pruebas');
  await page.goto('/');
  await page
    .getByLabel('Correo institucional')
    .fill('ana@student-fixtures.ruteam.invalid');
  await page.getByLabel('Contraseña').fill(password);
  await expectSuccessfulLogin(page);
  await page.goto('/profile');
  const profile = page.getByRole('heading', { name: 'Perfil', exact: true });
  await expect(profile).toBeVisible();
  const writes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && request.url().endsWith('/me/profile'))
      writes.push(request.method());
  });

  await page.context().setOffline(true);
  await expect(
    page.getByText(/Conexión perdida.*datos desactualizados/),
  ).toBeVisible();
  await expect(profile).toBeVisible();
  await page
    .getByLabel('Nombre visible')
    .fill('Nombre que no saldrá en la red');
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByText(/Operación no enviada/)).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText(/datos desactualizados/)).toHaveCount(0);
  expect(writes).toEqual([]);

  const api = process.env.RUTEAM_E2E_API_URL ?? 'http://localhost:3100/api/v1';
  const response = await page.request.post(`${api}/auth/logout`, {
    headers: {
      'x-ruteam-client': 'web',
      Origin: process.env.RUTEAM_E2E_WEB_URL ?? 'http://localhost:8082',
    },
  });
  expect(response.status()).toBe(204);
  await expect(
    page.getByText('Tu sesión expiró. Inicia sesión nuevamente.'),
  ).toBeVisible({ timeout: 20000 });
  await expect(profile).toHaveCount(0);
});
