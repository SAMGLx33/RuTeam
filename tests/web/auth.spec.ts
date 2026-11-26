import { submitLoginForm, submitFixtureLogin } from './support/fixture-login';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const apiUrl = 'http://localhost:3100/api/v1';
const fixturePassword = () => {
  const value = process.env.AUTH_FIXTURE_PASSWORD;
  if (!value) throw new Error('Configura AUTH_FIXTURE_PASSWORD en Playwright');
  return value;
};
async function capture(page: Page, info: TestInfo, surface: string) {
  const directory = join('/tmp/ruteam-product-ux/auth', info.project.name);
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: join(directory, `${surface}.png`),
    fullPage: true,
  });
}
async function signIn(page: Page, identity: 'ana' | 'diego' | 'laura') {
  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión', exact: true }),
  ).toBeVisible();
  await page
    .locator('input[aria-label="Correo institucional"]:visible')
    .fill(`${identity}@student-fixtures.ruteam.invalid`);
  await page
    .locator('input[aria-label="Contraseña"]:visible')
    .fill(fixturePassword());
  const response = await submitLoginForm(page);
  expect(response.status()).toBe(200);
  const session = await response.json();
  expect(session).not.toHaveProperty('token');
  return session as { account: { profile: { displayName: string } } };
}

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus && !page.isClosed()) {
    await capture(page, info, 'failure').catch(() => {
      info.annotations.push({
        type: 'evidence',
        description: 'No se pudo capturar la página fallida.',
      });
    });
  }
});

test('login convencional, elegibilidad, permisos y perfil persistido en sesiones independientes', async ({
  page,
  browser,
  request,
}, testInfo) => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (
    !databaseUrl ||
    databaseUrl === process.env.DATABASE_URL ||
    !new URL(databaseUrl).pathname.endsWith('_test')
  ) {
    throw new Error(
      'El fixture de onboarding exige PostgreSQL_test independiente',
    );
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  let onboarding:
    | {
        id: string;
        onboardingStep: number;
        onboardingCompletedAt: Date | null;
        usagePreference: 'PASSENGER' | 'DRIVER_AND_PASSENGER' | null;
      }
    | undefined;
  const errors: string[] = [],
    syntheticRequests: string[] = [];
  const observe = (target: Page) => {
    target.on('pageerror', (error) => errors.push(error.message));
    target.on('request', (req) => {
      if (req.url().endsWith('/auth/demo/login'))
        syntheticRequests.push(req.method());
    });
  };
  observe(page);
  let originalName: string | undefined;
  let restored = false;
  try {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Iniciar sesión', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(
      page.getByRole('button', {
        name: /Abrir acceso de desarrollo|Entrar en desarrollo|Elegir usuario/,
      }),
    ).toHaveCount(0);
    await capture(page, testInfo, 'login');
    await page.getByRole('link', { name: 'Crear cuenta', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Crear cuenta', exact: true }),
    ).toBeVisible();
    await capture(page, testInfo, 'register');
    await page.getByRole('link', { name: 'Volver a iniciar sesión' }).click();

    // Authentication succeeds, but an ineligible account never gains travel access.
    await signIn(page, 'laura');
    await expect(page).toHaveURL(/\/verify-email$/);
    await expect(
      page.getByRole('heading', { name: 'Vinculación no elegible' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Publicar viaje', exact: true }),
    ).toHaveCount(0);
    await capture(page, testInfo, 'verification-ineligible');
    await page.goto('/publish');
    await expect(page).toHaveURL(/\/verify-email$/);
    await page
      .getByRole('button', { name: 'Cerrar sesión', exact: true })
      .click();

    onboarding = await db.user.findUniqueOrThrow({
      where: { email: 'ana@student-fixtures.ruteam.invalid' },
      select: {
        id: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
        usagePreference: true,
      },
    });
    await db.user.update({
      where: { id: onboarding.id },
      data: {
        onboardingStep: 0,
        onboardingCompletedAt: null,
        usagePreference: 'PASSENGER',
      },
    });
    const session = await signIn(page, 'ana');
    originalName = session.account.profile.displayName;
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: 'Tu cuenta', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: '¿Cómo usarás RuTeam?', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: '¿Cómo usarás RuTeam?', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Paso 2 de 5', { exact: true })).toBeVisible();
    await capture(page, testInfo, 'onboarding-resumed');
    await page
      .getByRole('button', { name: 'Viajar como pasajero', exact: true })
      .click();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Tu movilidad', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Habilitación para conducir',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Gestionar vehículos y documentos',
        exact: true,
      }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Ya puedes empezar', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Ir al inicio', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Inicio', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Nombre visible', { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Publicar viaje', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Mis viajes publicados', exact: true }),
    ).toHaveCount(0);
    await capture(page, testInfo, 'passenger-home');
    await page.goto('/publish');
    await expect(page).toHaveURL(/\/profile$/);
    await expect(
      page.getByRole('heading', { name: 'Perfil', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Publicar viaje', exact: true }),
    ).toHaveCount(0);
    const name = `Ana QA ${testInfo.project.name}`;
    await page.getByLabel('Nombre visible', { exact: true }).fill(name);
    await page
      .getByRole('button', { name: 'Guardar nombre', exact: true })
      .click();
    await expect(
      page.getByText('Nombre actualizado.', { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByLabel('Nombre visible', { exact: true }),
    ).toHaveValue(name);
    await capture(page, testInfo, 'profile');
    const cookie = (await page.context().cookies()).find(
      ({ name }) => name === 'ruteam_session',
    );
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Strict');

    const context = await browser.newContext({ viewport: page.viewportSize() });
    try {
      const driver = await context.newPage();
      observe(driver);
      await driver.goto('http://localhost:8082');
      await signIn(driver, 'diego');
      await expect(
        driver.getByRole('heading', { name: 'Inicio', exact: true }),
      ).toBeVisible();
      await expect(
        driver
          .getByRole('link', { name: 'Publicar viaje', exact: true })
          .first(),
      ).toBeVisible();
      await expect(
        driver
          .getByRole('link', { name: 'Mis viajes publicados', exact: true })
          .first(),
      ).toBeVisible();
      await capture(driver, testInfo, 'driver-home');
      await driver.goto('http://localhost:8082/profile');
      await expect(
        driver.getByText('diego@student-fixtures.ruteam.invalid', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByLabel('Nombre visible', { exact: true }),
      ).toHaveValue(name);
      const catalog = await driver.request.get(`${apiUrl}/campus/destinations`);
      expect(catalog.status()).toBe(200);
      expect((await catalog.json()).length).toBeGreaterThan(0);
      await driver
        .getByRole('button', { name: 'Cerrar sesión', exact: true })
        .click();
      await expect(
        driver.getByRole('heading', { name: 'Iniciar sesión', exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }

    // The changed name is disposable; restore the shared seed before logging out.
    await page.getByLabel('Nombre visible', { exact: true }).fill(originalName);
    await page
      .getByRole('button', { name: 'Guardar nombre', exact: true })
      .click();
    await expect(
      page.getByText('Nombre actualizado.', { exact: true }),
    ).toBeVisible();
    restored = true;
    await page
      .getByRole('button', { name: 'Cerrar sesión', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Iniciar sesión', exact: true }),
    ).toBeVisible();
    await page.goto('/profile');
    await expect(
      page.getByRole('heading', { name: 'Iniciar sesión', exact: true }),
    ).toBeVisible();
    expect(syntheticRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    // Failure cleanup uses the normal API, never a public fixture-login endpoint.
    try {
      if (originalName && !restored) {
        const login = await submitFixtureLogin(() =>
          request.post(`${apiUrl}/auth/login`, {
            headers: { 'x-ruteam-client': 'native' },
            data: {
              email: 'ana@student-fixtures.ruteam.invalid',
              password: fixturePassword(),
            },
          }),
        );
        if (login.ok()) {
          const { token } = await login.json();
          const headers = {
            'x-ruteam-client': 'native',
            Authorization: `Bearer ${token}`,
          };
          await request.patch(`${apiUrl}/me/profile`, {
            headers,
            data: { displayName: originalName },
          });
          await request.post(`${apiUrl}/auth/logout`, { headers });
        }
      }
    } finally {
      try {
        if (onboarding) {
          const { id, ...previous } = onboarding;
          await db.user.update({ where: { id }, data: previous });
        }
      } finally {
        await db.$disconnect();
      }
    }
  }
});
