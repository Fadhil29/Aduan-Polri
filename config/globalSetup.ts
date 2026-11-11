// login sekali per role sebelum test jalan, sesi disimpan ke .auth/<role>.json (+ .session.json)
// kredensial dari .env: <ROLE>_USERNAME dan <ROLE>_PASSWORD
// pilih role tertentu: ROLE=admin npm test  (PowerShell: $env:ROLE="admin")
// role tanpa kredensial di .env tapi sudah punya .auth/<role>.json (dari codegen:auth) -> sesi lama dipakai
import fs from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import { assertStaging } from './env';
import { ROLES, authFile, sessionFile, credentials } from './roles';
import { LoginPage } from '../pages/LoginPage';

export default async function globalSetup(): Promise<void> {
  if (ROLES.length === 0) return; // aplikasi tanpa role / belum dikonfigurasi

  assertStaging('globalSetup');

  const picked = (process.env.ROLE ?? '').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
  const targetRoles = picked.length ? ROLES.filter((r) => picked.includes(r)) : ROLES;
  if (picked.length && targetRoles.length === 0) {
    throw new Error(`ROLE="${process.env.ROLE}" tidak ada di ROLES (${ROLES.join(', ')})`);
  }

  fs.mkdirSync('test-results', { recursive: true });
  let browser: Browser | undefined; // dibuka hanya kalau ada role yang perlu login
  try {
    for (const role of targetRoles) {
      const { username, password } = credentials(role);
      if (!username || !password) {
        if (fs.existsSync(authFile(role))) {
          console.log(`[${role}] kredensial kosong, pakai sesi yang sudah ada di .auth/${role}.json`);
          // sesi manual (captcha/OTP) tidak diperbarui otomatis: ingatkan kalau sudah lama
          const maxAgeHours = Number(process.env.AUTH_MAX_AGE_HOURS ?? 8);
          const ageHours = (Date.now() - fs.statSync(authFile(role)).mtimeMs) / 36e5;
          if (ageHours > maxAgeHours) {
            console.warn(`[${role}] sesi berumur ${ageHours.toFixed(1)} jam (batas ${maxAgeHours}). Kalau test redirect ke /login, jalankan: npm run codegen:auth -- ${role}`);
          }
          continue;
        }
        throw new Error(`Isi ${role.toUpperCase()}_USERNAME dan ${role.toUpperCase()}_PASSWORD di .env, atau jalankan: npm run codegen:auth -- ${role}`);
      }

      browser ??= await chromium.launch();
      const context = await browser.newContext({ baseURL: process.env.BASE_URL, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
      const page = await context.newPage();
      try {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(username, password);
        await loginPage.waitForLoggedIn();

        const state = await context.storageState({ path: authFile(role) });
        const session = await page.evaluate(() => ({
          host: location.hostname,
          items: Object.fromEntries(Object.entries(sessionStorage)),
        }));
        fs.writeFileSync(sessionFile(role), JSON.stringify(session));

        // hanya jumlah/nama key, tanpa nilai
        console.log(
          `[${role}] cookies=${state.cookies.length}`,
          `localStorage=${state.origins.flatMap((o) => o.localStorage.map((i) => i.name)).join(',')}`,
          `sessionStorage=${Object.keys(session.items).join(',')}`,
        );
      } catch (error) {
        await page.screenshot({ path: `test-results/login-gagal-${role}.png` });
        throw new Error(`Login role "${role}" gagal: ${(error as Error).message}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser?.close();
  }
}
