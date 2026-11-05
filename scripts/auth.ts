// login manual (untuk login yang kena reCAPTCHA/OTP): buka browser, kamu login sendiri,
// lalu cookie + localStorage + sessionStorage disimpan ke .auth/<role>.json dan .auth/<role>.session.json
// pemakaian: npm run auth -- polres
import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { assertStaging } from '../config/env';
import { ROLES, authFile, sessionFile } from '../config/roles';
import { LoginPage } from '../pages/LoginPage';

async function main(): Promise<void> {
  assertStaging('auth');

  const role = (process.argv[2] ?? ROLES[0] ?? '').trim().toLowerCase();
  if (!role || (ROLES.length && !ROLES.includes(role))) {
    throw new Error(`Role "${role}" tidak ada di ROLES (${ROLES.join(', ')}). Contoh: npm run auth -- polres`);
  }

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ baseURL: process.env.BASE_URL, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    console.log(`[auth] Login sebagai "${role}" di browser yang terbuka (selesaikan captcha). Maksimal 5 menit, jangan tutup browsernya.`);
    // tunggu form muncul dulu, kalau tidak "hilang" langsung lolos sebelum halaman selesai dimuat
    await expect(loginPage.loginButton()).toBeVisible({ timeout: 30_000 });
    await expect(loginPage.loginButton()).toBeHidden({ timeout: 300_000 });
    await page.waitForLoadState('networkidle');

    const state = await context.storageState();
    const session = await page.evaluate(() => ({
      host: location.hostname,
      items: Object.fromEntries(Object.entries(sessionStorage)),
    }));

    const appHost = new URL(process.env.BASE_URL!).hostname;
    const hasLogin =
      state.cookies.some((c) => appHost.endsWith(c.domain.replace(/^\./, ''))) ||
      state.origins.some((o) => new URL(o.origin).hostname === appHost && o.localStorage.length > 0) ||
      Object.keys(session.items).length > 0;
    if (!hasLogin) {
      throw new Error('Tidak ada data login (cookie/localStorage/sessionStorage) dari aplikasi, sesi TIDAK disimpan. Ulangi dan pastikan sudah masuk ke dashboard.');
    }

    fs.writeFileSync(authFile(role), JSON.stringify(state));
    fs.writeFileSync(sessionFile(role), JSON.stringify(session));

    // hanya nama key, tanpa nilai
    console.log(
      `[auth] ${role} tersimpan.`,
      `cookies=${state.cookies.map((c) => c.name).join(',')}`,
      `localStorage=${state.origins.flatMap((o) => o.localStorage.map((i) => i.name)).join(',')}`,
      `sessionStorage=${Object.keys(session.items).join(',')}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`\n[auth] ${(error as Error).message}\n`);
  process.exit(1);
});
