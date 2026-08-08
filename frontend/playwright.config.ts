import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig, cucumberReporter } from 'playwright-bdd'

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'tests/steps/**/*.ts',
})

export default defineConfig({
  testDir,
  reporter: [
    ['list'],
    cucumberReporter('html', { outputFile: 'test-results/cucumber-report/report.html' }),
  ],
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
