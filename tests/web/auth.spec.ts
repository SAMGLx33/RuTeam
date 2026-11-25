import { expect, test } from '@playwright/test';
test('inactiva denegada; pasajera y conductor editan perfil con API real', async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Tu comunidad. Un mismo destino.')).toBeVisible();
  await expect(page.getByRole('radio', { name: /Ana/ })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Abrir acceso de desarrollo' })
    .click();
  await page.getByRole('radio', { name: /Laura/ }).click();
  await page.getByRole('button', { name: 'Entrar en desarrollo' }).click();
  await expect(page.getByRole('alert')).toContainText('inactiva');
  await page.getByRole('radio', { name: /Ana/ }).click();
  const me = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/auth/me') && response.status() === 200,
  );
  await page.getByRole('button', { name: 'Entrar en desarrollo' }).click();
  await me;
  await expect(page.getByText('Estudiante · ACTIVA')).toBeVisible();
  const name = `Ana ${testInfo.project.name}`;
  await page.getByLabel('Nombre para mostrar').fill(name);
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText('Perfil guardado en PostgreSQL.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nombre para mostrar')).toHaveValue(name);
  await expect(page.getByText(/punto de ejemplo no verificado/)).toBeVisible();
  await page.screenshot({
    path: `/tmp/ruteam-${testInfo.project.name}-profile.png`,
    fullPage: true,
  });
  const context = await browser.newContext();
  try {
    const driver = await context.newPage();
    await driver.goto('http://localhost:8082');
    await driver
      .getByRole('button', { name: 'Abrir acceso de desarrollo' })
      .click();
    await driver.getByRole('radio', { name: /Diego/ }).click();
    await driver.getByRole('button', { name: 'Entrar en desarrollo' }).click();
    await expect(driver.getByText('Estudiante · ACTIVA')).toBeVisible();
    await expect(
      driver.getByText('Pasajero y conductor habilitado'),
    ).toBeVisible();
    await expect(page.getByLabel('Nombre para mostrar')).toHaveValue(name);
    await driver.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(
      driver.getByRole('button', { name: 'Abrir acceso de desarrollo' }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(
    page.getByRole('button', { name: 'Abrir acceso de desarrollo' }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/ruteam-${testInfo.project.name}-login.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
