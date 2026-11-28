import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../backend/src/generated/prisma/client';
import { submitLoginForm } from './support/fixture-login';

const passwordField = (page: Page, label: string) =>
  page.locator(`input[aria-label="${label}"]:visible`);

async function login(page: Page, email: string, password: string) {
  await page
    .getByRole('textbox', { name: 'Correo institucional', exact: true })
    .fill(email);
  await passwordField(page, 'Contraseña').fill(password);
  return submitLoginForm(page);
}

for (const channel of ['EMAIL', 'PHONE'] as const) {
  test(`confirma ${channel} y cambia la contraseña por OTP en la interfaz real`, async ({
    page,
  }) => {
    const log = process.env.RUTEAM_OTP_TEST_LOG;
    test.skip(!log, 'Requiere captura privada de la terminal de NestJS.');
    const url = process.env.TEST_DATABASE_URL;
    if (
      !url ||
      url === process.env.DATABASE_URL ||
      !new URL(url).pathname.endsWith('_test')
    )
      throw new Error('Se requiere PostgreSQL de pruebas aislado.');

    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
    const suffix = randomUUID();
    const email = `otp-web-${suffix}@usc.edu.co`;
    const password = randomUUID();
    const replacement = randomUUID();
    const phone = '+1 (202) 555-0179';

    const terminal = () => readFile(log!, 'utf8').catch(() => '');
    async function readCode(previous: string, purpose: string) {
      let code: string | undefined;
      await expect
        .poll(async () => {
          const lines = (await terminal()).slice(previous.length).split('\n');
          code = lines
            .findLast(
              (line) =>
                line.includes(`Propósito: ${purpose}`) &&
                line.includes('Código:'),
            )
            ?.match(/Código: (\d{6})/u)?.[1];
          return Boolean(code);
        })
        .toBe(true);
      return code!;
    }

    try {
      await page.goto('/register');
      const beforeRegister = await terminal();
      await page
        .getByRole('textbox', { name: 'Nombre', exact: true })
        .fill('Cuenta OTP web');
      await page
        .getByRole('textbox', { name: 'Correo institucional', exact: true })
        .fill(email);
      await passwordField(page, 'Contraseña nueva').fill(password);
      if (channel === 'PHONE') {
        await page
          .getByRole('button', { name: 'Teléfono', exact: true })
          .click();
        const country = page.getByRole('button', { name: /Colombia \+57/ });
        await expect(country).toBeVisible();
        const national = page.getByRole('textbox', { name: 'Número nacional' });
        await expect(national).toHaveValue('');
        await national.fill('300 555 0199');
        await expect(national).toHaveValue('3005550199');
        await country.click();
        const search = page.getByRole('textbox', {
          name: 'Buscar país o prefijo',
        });
        await search.fill('+1');
        await expect(
          page.getByRole('button', { name: /Canadá \+1/ }),
        ).toBeVisible();
        await search.fill('Estados Unidos');
        await page.getByRole('button', { name: /Estados Unidos \+1/ }).click();
        await national.fill(phone);
        await expect(national).toHaveValue('2025550179');
      } else {
        await page
          .getByRole('textbox', { name: 'Dirección de correo personal' })
          .fill(suffix + '@example.test');
      }
      await page
        .getByRole('checkbox', { name: 'Acepto las condiciones de uso' })
        .click();
      await page
        .getByRole('button', { name: 'Crear cuenta', exact: true })
        .click();
      await expect(
        page.getByRole('heading', {
          name: 'Confirma tu medio de recuperación',
        }),
      ).toBeVisible();
      const confirmation = await readCode(
        beforeRegister,
        'CONTACT_CONFIRMATION',
      );
      await expect(page.getByText(/Pendiente de confirmación/)).toBeVisible();
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      if (channel === 'PHONE') {
        expect(
          await db.recoveryContact.count({
            where: { userId: user.id, contact: '+12025550179', pending: true },
          }),
        ).toBe(1);
        await page
          .getByRole('button', { name: 'Cambiar medio de recuperación' })
          .click();
        await page
          .getByRole('button', { name: 'Teléfono', exact: true })
          .click();
        const number = page.getByRole('textbox', { name: 'Número nacional' });
        await number.fill(phone);
        await passwordField(page, 'Contraseña actual').fill(password);
        await page
          .getByRole('button', { name: 'Guardar medio de recuperación' })
          .click();
      } else {
        await page.getByRole('button', { name: 'Omitir por ahora' }).click();
        await expect(page.getByText(/Todavía no has confirmado/)).toBeVisible();
        await page
          .getByRole('button', { name: 'Continuar sin confirmar' })
          .click();
        await expect(page).toHaveURL(/onboarding/);
        await page.goto('/account-settings');
      }
      await page
        .getByRole('textbox', { name: 'Código de seis dígitos' })
        .fill(confirmation);
      await page.getByRole('button', { name: 'Validar código' }).click();
      await expect(
        page.getByText('Medio confirmado mediante transporte local.'),
      ).toBeVisible();
      if (channel === 'PHONE') {
        await page
          .getByRole('button', { name: 'Continuar al onboarding' })
          .click();
        await expect(page).toHaveURL(/onboarding/);
        await page.goto('/account-settings');
      }
      await page
        .getByRole('button', { name: 'Cerrar sesión en este dispositivo' })
        .click();
      await expect(
        page.getByRole('button', { name: 'Iniciar sesión', exact: true }),
      ).toBeVisible();
      expect(
        await db.recoveryContact.count({
          where: {
            userId: user.id,
            pending: false,
            confirmedAt: { not: null },
            transport: 'CONSOLE',
          },
        }),
      ).toBe(1);
      await page.goto('/recover-access', { waitUntil: 'domcontentloaded' });
      const beforeReset = await terminal();
      await page
        .getByRole('textbox', { name: 'Correo institucional' })
        .fill(email);
      await page.getByRole('button', { name: 'Solicitar código' }).click();
      await expect(
        page.getByText(/Si la cuenta tiene un medio confirmado/),
      ).toBeVisible();
      await expect(page.getByText(/Tiempo restante/)).toHaveCount(0);
      const otp = await readCode(beforeReset, 'PASSWORD_RESET');
      await page
        .getByRole('textbox', { name: 'Código de seis dígitos' })
        .fill(otp);
      await page.getByRole('button', { name: 'Validar código' }).click();
      await passwordField(page, 'Contraseña nueva').fill(replacement);
      await passwordField(page, 'Confirmar contraseña nueva').fill(replacement);
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();
      await expect(page.getByText(/Contraseña actualizada/)).toBeVisible();
      await page.getByRole('button', { name: 'Ir a iniciar sesión' }).click();
      expect((await login(page, email, replacement)).status()).toBe(200);
      expect(
        await db.authSession.count({
          where: { userId: user.id, revokedAt: { not: null } },
        }),
      ).toBe(1);
    } finally {
      await db.user.deleteMany({ where: { email } });
      await db.$disconnect();
    }
  });
}
