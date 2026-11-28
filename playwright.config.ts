import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import fixtures from './scripts/test-fixtures.json';
config({ quiet: true });
// Known password for isolated synthetic TEST accounts only. Override in the process
// environment and run db:seed with the same value; never use this for real accounts.
process.env.AUTH_FIXTURE_PASSWORD ??= fixtures.defaultAuthFixturePassword;
if (
  !process.env.TEST_DATABASE_URL ||
  process.env.TEST_DATABASE_URL === process.env.DATABASE_URL ||
  !/^[a-z][a-z0-9_]*_test$/.test(
    decodeURIComponent(
      new URL(process.env.TEST_DATABASE_URL).pathname.slice(1),
    ),
  )
) {
  throw new Error(
    'Playwright exige TEST_DATABASE_URL distinta de desarrollo y con sufijo _test',
  );
}
export default defineConfig({
  testDir: './tests/web',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:8082' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-web',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://localhost:3100/api/v1/health',
      timeout: 60000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        AUTH_FIXTURE_PASSWORD: process.env.AUTH_FIXTURE_PASSWORD,
        // Exercise the durable notification worker, which is paused in NODE_ENV=test.
        // The process still connects exclusively to TEST_DATABASE_URL above.
        NODE_ENV: 'development',
        PORT: '3100',
        CORS_ORIGINS: 'http://localhost:8082',
        DEMO_MODE: 'true',
        VERIFICATION_PROVIDER: 'demo',
        INSTITUTIONAL_ACCESS_MODE: 'DECLARED_DOMAIN',
        // Browser coverage uses seeded, verified accounts and never real SMTP.
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: '1',
        SMTP_SECURE: 'false',
      },
    },
    {
      // Rebuild Expo's manifest so the test API overrides a previous export's URL.
      command:
        'npm run export:web -w @ruteam/client -- --clear --max-workers 2 && node scripts/serve-playwright-web.mjs',
      url: 'http://localhost:8082',
      timeout: 240000,
      reuseExistingServer: false,
      env: {
        CI: '1',
        EXPO_PUBLIC_API_URL: 'http://localhost:3100/api/v1',
        EXPO_PUBLIC_ROUTE_TILE_URL:
          'https://tiles.ruteam.invalid/{z}/{x}/{y}.png',
        EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION: 'Teselas sintéticas de prueba',
      },
    },
  ],
});
