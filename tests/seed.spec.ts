import { test } from '../config/fixtures';

// Seed untuk agent Playwright (planner / generator / healer).
// Kondisi awal: aplikasi terbuka di BASE_URL (dari .env).
// Project 'seed' memakai sesi role pertama di ROLES. Role lain: jalankan lewat project role
// (contoh --project=polda-chromium) atau test.use({ storageState: '.auth/polda.json' })
test.describe('Seed', () => {
  test('seed', async ({ page }) => {
    await page.goto('/');
  });
});
