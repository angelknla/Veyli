import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'Desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'Mobile',
      testIgnore: '**/api.spec.ts',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VEYLI_INTEGRATION_DATABASE: 'memory://',
      ANONYMOUS_COOKIE_SECRET: 'isolated-browser-test-cookie-secret-not-for-deployment-123',
      ADMIN_ACCESS_KEY: 'isolated-admin-test-secret-not-for-deployment-123',
    },
  },
});
