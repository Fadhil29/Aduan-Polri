// memastikan sesi login tiap role tersimpan di .auth/ dan masih valid. login-nya dijalankan config/globalSetup.ts.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { ROLES, authFile } from '../../config/roles';
import { restoreSession } from '../../config/fixtures';
import { LoginPage } from '../../pages/LoginPage';

const picked = (process.env.ROLE ?? '').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
const roles = picked.length ? ROLES.filter((r) => picked.includes(r)) : ROLES;

test('ROLES sudah diisi di .env', () => {
  expect(ROLES.length, 'isi ROLES di .env, contoh ROLES=polres,polda').toBeGreaterThan(0);
});

for (const role of roles) {
  test(`sesi login ${role} masih valid`, async ({ browser }) => {
    // Test Step :
    // 1. pastikan file sesi .auth/<role>.json ada
    // 2. buka aplikasi memakai sesi tersebut
    // 3. pastikan tidak dilempar balik ke halaman login
    expect(fs.existsSync(authFile(role)), `.auth/${role}.json belum ada`).toBeTruthy();

    const context = await browser.newContext({ baseURL: process.env.BASE_URL, storageState: authFile(role) });
    await restoreSession(context, role);
    const page = await context.newPage();
    try {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page, `sesi ${role} kedaluwarsa, jalankan ulang npm run setup`).not.toHaveURL(/\/login/);
      await expect(new LoginPage(page).loginButton()).toBeHidden();
    } finally {
      await context.close();
    }
  });
}
