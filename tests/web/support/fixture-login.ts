import { expect, test, type Page } from '@playwright/test';
import { setTimeout } from 'node:timers/promises';

type LoginResponse = {
  status(): number;
  headers(): Record<string, string>;
};

export async function submitFixtureLogin<T extends LoginResponse>(
  submit: () => Promise<T>,
): Promise<T> {
  const response = await submit();
  if (response.status() !== 429) return response;
  const retryAfter = Number(response.headers()['retry-after']);
  if (!Number.isFinite(retryAfter) || retryAfter <= 0 || retryAfter > 60)
    return response;

  // All browsers share localhost. Keep Nest's login quota active during E2E.
  const cooldown = retryAfter * 1000 + 250;
  const info = test.info();
  info.setTimeout(info.timeout + cooldown + 5000);
  await setTimeout(cooldown);
  return submit();
}

export function submitLoginForm(page: Page) {
  return submitFixtureLogin(async () => {
    const [response] = await Promise.all([
      page.waitForResponse(
        (result) =>
          result.url().endsWith('/api/v1/auth/login') &&
          result.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(),
    ]);
    return response;
  });
}

export async function expectSuccessfulLogin(page: Page) {
  expect((await submitLoginForm(page)).status()).toBe(200);
}
