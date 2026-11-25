import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ quiet: true });
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
        PORT: '3100',
        CORS_ORIGINS: 'http://localhost:8082',
        DEMO_MODE: 'true',
        VERIFICATION_PROVIDER: 'demo',
      },
    },
    {
      command:
        'npm exec -w @ruteam/client -- expo start --web --port 8082 --clear',
      url: 'http://localhost:8082',
      timeout: 120000,
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
