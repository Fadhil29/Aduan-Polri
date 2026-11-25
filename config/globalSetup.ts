// login sekali per role sebelum test jalan, sesi disimpan ke .auth/<role>.json (+ .session.json)
// kredensial dari .env: <ROLE>_USERNAME dan <ROLE>_PASSWORD
// pilih role tertentu: ROLE=admin npm test  (PowerShell: $env:ROLE="admin")
// sesi .auth/<role>.json yang masih baru (< AUTH_MAX_AGE_HOURS, default 8 jam) dipakai ulang, tidak login lagi.
// paksa login ulang: FORCE_LOGIN=true. login kena reCAPTCHA diulang sampai LOGIN_MAX_ATTEMPTS (default 5).
// role tanpa kredensial di .env tapi sudah punya .auth/<role>.json (dari npm run auth) -> sesi lama dipakai
import fs from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import { assertStaging } from './env';
import { ROLES, authFile, sessionFile, credentials } from './roles';
import { LoginPage } from '../pages/LoginPage';
import { restoreSession } from './session';

export default async function globalSetup(): Promise<void> {
  if (ROLES.length === 0) return; // aplikasi tanpa role / belum dikonfigurasi

  assertStaging('globalSetup');

  const picked = (process.env.ROLE ?? '').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
  const targetRoles = picked.length ? ROLES.filter((r) => picked.includes(r)) : ROLES;
  if (picked.length && targetRoles.length === 0) {
    throw new Error(`ROLE="${process.env.ROLE}" tidak ada di ROLES (${ROLES.join(', ')})`);
  }

  fs.mkdirSync('test-results', { recursive: true });
  const maxAgeHours = Number(process.env.AUTH_MAX_AGE_HOURS ?? 8);
  const forceLogin = process.env.FORCE_LOGIN === 'true';
  const ageHours = (role: string) => (Date.now() - fs.statSync(authFile(role)).mtimeMs) / 36e5;
  let browser: Browser | undefined; // dibuka hanya kalau perlu
  const bukaBrowser = async () => (browser ??= await chromium.launch());

  // cek sesi tersimpan masih berlaku: buka aplikasi dengan sesi itu, form login tidak boleh muncul
  const sesiBerlaku = async (role: string): Promise<boolean> => {
    const context = await (await bukaBrowser()).newContext({ baseURL: process.env.BASE_URL, storageState: authFile(role) });
    await restoreSession(context, role);
    try {
      return await new LoginPage(await context.newPage()).sudahMasuk();
    } finally {
      await context.close();
    }
  };

  try {
    for (const role of targetRoles) {
      const { username, password } = credentials(role);

      // sesi masih baru DAN masih berlaku: pakai ulang, supaya tidak tiap run berurusan dengan reCAPTCHA
      if (!forceLogin && fs.existsSync(authFile(role)) && ageHours(role) <= maxAgeHours) {
        if (await sesiBerlaku(role)) {
          console.log(`[${role}] pakai sesi .auth/${role}.json (umur ${ageHours(role).toFixed(1)} jam). login ulang: FORCE_LOGIN=true`);
          continue;
        }
        console.warn(`[${role}] sesi .auth/${role}.json tidak berlaku (form login muncul), login ulang`);
      }

      if (!username || !password) {
        if (fs.existsSync(authFile(role))) {
          console.log(`[${role}] kredensial kosong, pakai sesi yang sudah ada di .auth/${role}.json`);
          // sesi manual tidak diperbarui otomatis: ingatkan karena sudah lama
          console.warn(`[${role}] sesi berumur ${ageHours(role).toFixed(1)} jam (batas ${maxAgeHours}). Kalau test redirect ke /login, jalankan: npm run auth -- ${role}`);
          continue;
        }
        throw new Error(`Isi ${role.toUpperCase()}_USERNAME dan ${role.toUpperCase()}_PASSWORD di .env, atau jalankan: npm run auth -- ${role}`);
      }

      const context = await (await bukaBrowser()).newContext({ baseURL: process.env.BASE_URL, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
      const page = await context.newPage();
      try {
        // reCAPTCHA gagal -> klik OK, jeda, ulang (maks LOGIN_MAX_ATTEMPTS, default 5)
        await new LoginPage(page).loginDenganUlang(username, password);
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {}); // bisa tidak pernah idle

        // cookie + localStorage + IndexedDB
        const state = await context.storageState({ path: authFile(role), indexedDB: true });
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
