import { defineConfig, devices, type Project } from '@playwright/test';
import './config/env';
import { ROLES, authFile } from './config/roles';

// tambah firefox/webkit di sini kalau perlu cross-browser
const BROWSERS: Project[] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
];

const projects: Project[] = ROLES.length
  ? [
      // cek sesi login hasil globalSetup: npm run setup
      { name: 'login-check', testDir: './tests/login-check', use: { ...devices['Desktop Chrome'] } },

      // seed untuk agent playwright (planner/generator/healer), login sebagai role pertama di ROLES
      {
        name: 'seed',
        testDir: './tests',
        testMatch: 'seed.spec.ts',
        metadata: { role: ROLES[0] },
        use: { ...devices['Desktop Chrome'], storageState: authFile(ROLES[0]) },
      },

      // satu project per role per browser, contoh: admin-chromium -> tests/admin
      ...ROLES.flatMap((role) =>
        BROWSERS.map((browser) => ({
          name: `${role}-${browser.name}`,
          testDir: `./tests/${role}`,
          use: { ...browser.use, storageState: authFile(role) },
        })),
      ),

      // tanpa login
      ...BROWSERS.map((browser) => ({
        name: `public-${browser.name}`,
        testDir: './tests/public',
        use: browser.use,
      })),
    ]
  : // ROLES kosong: semua test di tests/ jalan tanpa sesi
    BROWSERS.map((browser) => ({ ...browser, testIgnore: ['**/login-check/**'] }));

export default defineConfig({
  testDir: './tests',
  globalSetup: './config/globalSetup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // batas total run supaya CI tidak menggantung; reporter tetap menulis laporan saat kena batas
  globalTimeout: 60 * 60 * 1000,

  // berurutan, karena spec bernomor (01-, 02-) dan data staging dipakai bersama
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },

  projects,
});
