import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { exerciseMobility } from './support/mobility-journey';

test.use({ actionTimeout: 20_000 });

async function register(
  page: Page,
  identity: { name: string; email: string; password: string },
  driver: boolean,
  capture?: (surface: string) => Promise<void>,
) {
  await page.goto('/');
  const registerLink = page.getByRole('link', {
    name: 'Crear cuenta',
    exact: true,
  });
  await expect(registerLink).toBeVisible();
  if (capture) await capture('login');
  await registerLink.click();
  await expect(
    page.getByText(/Regístrate con una dirección de correo terminada/),
  ).toBeVisible();
  if (capture) await capture('register');
  await page
    .getByRole('textbox', { name: 'Nombre', exact: true })
    .fill(identity.name);
  const email = page.getByRole('textbox', {
    name: 'Correo institucional',
    exact: true,
  });
  await email.fill('cuenta@usc.edu.co.fake.test');
  const passwordField = page.locator('input[aria-label="Contraseña nueva"]');
  await passwordField.fill(identity.password);
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(passwordField).toHaveJSProperty('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(passwordField).toHaveAttribute('type', 'password');

  if (driver)
    await page
      .getByRole('button', { name: 'Conducir y viajar como pasajero' })
      .click();
  const submit = page.getByRole('button', {
    name: 'Crear cuenta',
    exact: true,
  });
  const terms = page.getByRole('checkbox', {
    name: 'Acepto las condiciones de uso',
  });
  await terms.press('Space');
  await expect(terms).toBeChecked();
  await expect(submit).toBeDisabled();
  await email.fill(identity.email);
  await page
    .getByRole('textbox', { name: 'Dirección de correo personal' })
    .fill(identity.email.split('@')[0] + '@example.test');
  await expect(submit).toBeEnabled();
  const response = page.waitForResponse(
    (result) =>
      result.url().endsWith('/auth/register') &&
      result.request().method() === 'POST',
  );
  const loginResponse = page.waitForResponse(
    (result) =>
      result.url().endsWith('/auth/login') &&
      result.request().method() === 'POST',
  );
  const log = process.env.RUTEAM_OTP_TEST_LOG;
  const logOffset = log ? (await readFile(log, 'utf8')).length : 0;
  await submit.click();
  expect((await response).status()).toBe(202);
  const login = await loginResponse;
  expect(login.status()).toBe(200);
  if (log) {
    let code: string | undefined;
    await expect
      .poll(async () => {
        const additions = (await readFile(log, 'utf8')).slice(logOffset);
        code = additions.match(
          /Propósito: CONTACT_CONFIRMATION[^\n]*Código: (\d{6})/u,
        )?.[1];
        return Boolean(code);
      })
      .toBe(true);
    await page
      .getByRole('textbox', { name: 'Código de seis dígitos' })
      .fill(code!);
    await page.getByRole('button', { name: 'Validar código' }).click();
    await page.getByRole('button', { name: 'Continuar al onboarding' }).click();
  } else {
    await page.getByRole('button', { name: 'Omitir por ahora' }).click();
    await page.getByRole('button', { name: 'Continuar sin confirmar' }).click();
  }
  expect((await login.json()).account).toMatchObject({
    email: identity.email.toLowerCase(),
    synthetic: false,
    emailVerified: false,
    institutionalAccess: 'DECLARED_DOMAIN',
    eligibility: { status: 'DECLARED', validUntil: null },
    capabilities: { passenger: true, driver: false },
  });
}

test('dos cuentas nuevas usan dominio USC declarado sin correo ni acreditación', async ({
  page,
  browser,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  const url = process.env.TEST_DATABASE_URL;
  if (
    !url ||
    url === process.env.DATABASE_URL ||
    !new URL(url).pathname.endsWith('_test')
  )
    throw new Error('Se requiere una base de pruebas PostgreSQL aislada.');
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const context = await browser.newContext({
    viewport: page.viewportSize() ?? undefined,
    baseURL,
  });
  const driverPage = await context.newPage();
  const stamp = randomUUID().replaceAll('-', '').slice(0, 20);
  const identities = {
    passenger: {
      name: 'Pasajera de prueba',
      email: `ruteam-prueba-p-${stamp}@USC.EDU.CO`,
      password: randomUUID(),
    },
    driver: {
      name: 'Conductor de prueba',
      email: `ruteam-prueba-c-${stamp}@usc.edu.co`,
      password: randomUUID(),
    },
  };
  const appErrors: string[] = [];
  for (const current of [page, driverPage])
    current.on('pageerror', (error) => appErrors.push(error.name));

  const capture = async (target: Page, surface: string) => {
    const evidence = process.env.RUTEAM_EVIDENCE_DIR;
    if (!evidence) return;
    const dir = join(evidence, 'institutional-registration', info.project.name);
    await mkdir(dir, { recursive: true });
    await target.screenshot({ path: join(dir, surface + '.png') });
  };
  let exercisedJourney = false;
  try {
    await page.goto('/recover-access');
    if (process.env.RUTEAM_OTP_TEST_LOG)
      await expect(
        page.getByRole('button', { name: 'Solicitar código' }),
      ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Enviar enlace' }),
    ).toHaveCount(0);
    await register(page, identities.passenger, false, (surface) =>
      capture(page, surface),
    );
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByText('Acceso por dominio USC declarado'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    const preference = page.getByRole('heading', {
      name: '¿Cómo usarás RuTeam?',
    });
    await expect(preference).toBeVisible();
    await page.reload();
    await expect(preference).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page
      .getByRole('link', { name: 'Configurar movilidad', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Preferencias de movilidad' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Volver a la incorporación' }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page
      .getByRole('button', { name: 'Ir al inicio', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Inicio', exact: true }),
    ).toBeVisible();
    await capture(page, 'passenger-home');
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Viajes', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Viajes disponibles', exact: true }),
    ).toBeVisible();
    await page.goto('/profile');
    await expect(
      page.getByText('Acceso por dominio USC declarado'),
    ).toBeVisible();
    await expect(page.getByText(identities.driver.email)).toHaveCount(0);

    await register(driverPage, identities.driver, true);
    await driverPage
      .getByRole('button', { name: 'Siguiente', exact: true })
      .click();
    await driverPage
      .getByRole('button', { name: 'Siguiente', exact: true })
      .click();
    await driverPage
      .getByRole('button', { name: 'Continuar', exact: true })
      .click();
    await driverPage
      .getByRole('link', { name: 'Gestionar vehículos y documentos' })
      .click();
    await expect(
      driverPage.getByRole('heading', { name: 'Vehículos y licencia' }),
    ).toBeVisible();
    const expiry = new Date();
    expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
    const date = expiry.toISOString().slice(0, 10);
    const plate = `QA${String.fromCharCode(65 + (Number.parseInt(stamp.slice(0, 2), 16) % 26))}${String(Number.parseInt(stamp.slice(2, 8), 16) % 1000).padStart(3, '0')}`;
    await driverPage
      .getByRole('textbox', { name: 'Vencimiento licencia (AAAA-MM-DD)' })
      .fill(date);
    await driverPage
      .getByRole('button', { name: 'Guardar licencia declarada' })
      .click();
    await expect(
      driverPage.getByText(/Licencia declarada guardada/),
    ).toBeVisible();
    await driverPage
      .getByRole('textbox', { name: 'Placa', exact: true })
      .fill(plate);
    await driverPage
      .getByRole('textbox', { name: 'Marca', exact: true })
      .fill('Vehículo de prueba');
    await driverPage
      .getByRole('textbox', { name: 'Año del modelo', exact: true })
      .fill('2024');
    await driverPage
      .getByRole('textbox', {
        name: 'Vencimiento SOAT (AAAA-MM-DD)',
        exact: true,
      })
      .fill(date);
    await driverPage
      .getByRole('button', { name: 'Registrar vehículo', exact: true })
      .click();
    await expect(
      driverPage.getByText(/Vehículo registrado con información declarada/),
    ).toBeVisible();
    await driverPage
      .getByRole('link', { name: 'Volver a la incorporación' })
      .click();
    await driverPage
      .getByRole('button', { name: 'Continuar', exact: true })
      .click();
    await driverPage
      .getByRole('button', { name: 'Ir al inicio', exact: true })
      .click();
    await expect(
      driverPage
        .getByRole('link', { name: 'Publicar viaje', exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Publicar viaje', exact: true }),
    ).toHaveCount(0);
    expect(appErrors).toEqual([]);
    await capture(driverPage, 'driver-home');
    if (process.env.RUTEAM_OTP_TEST_LOG) {
      exercisedJourney = true;
      await exerciseMobility(db, page, driverPage, stamp);
    }
  } finally {
    await context.close();
    const emails = Object.values(identities).map(({ email }) =>
      email.toLowerCase(),
    );
    await db
      .$transaction(async (tx) => {
        if (exercisedJourney) return;
        const where = { email: { in: emails } };
        const id = {
          in: (await tx.user.findMany({ where, select: { id: true } })).map(
            ({ id }) => id,
          ),
        };
        await tx.driverEligibility.deleteMany({ where: { userId: id } });
        await tx.vehicle.deleteMany({ where: { ownerId: id } });
        await tx.user.deleteMany({ where });
      })
      .finally(() => db.$disconnect());
  }
});
