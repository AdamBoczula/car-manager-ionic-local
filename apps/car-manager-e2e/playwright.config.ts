import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4200';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run Firebase emulators + Angular dev server before starting the tests */
  webServer: [
    {
      command: 'npx firebase emulators:start --only auth,firestore --project carmanager-local',
      url: 'http://127.0.0.1:9099',
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
      timeout: 180_000,
    },
    {
      command: 'npm exec nx run car-manager:serve:e2e',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox and WebKit are enabled only in CI where the browsers are
    // pre-installed. Running them locally requires `npx playwright install
    // firefox webkit` first.
    ...(process.env.CI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
});
