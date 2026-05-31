// @ts-check
import { defineConfig, devices } from '@playwright/test';

const API_PORT = process.env.API_PORT || '3000';
const API_URL = process.env.VITE_API_URL || `http://localhost:${API_PORT}`;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://gympatico_test_user:SecretPassword2026@localhost:5432/gympatico_test_db';

const backendEnv = {
  NODE_ENV: 'test',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_test_key_2026',
  DATABASE_URL,
  PORT: API_PORT,
};

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/example.spec.js'],
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start',
      cwd: '../backend',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: backendEnv,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
});
