Rapikan rekaman Playwright berikut sesuai aturan di CLAUDE.md.
Hasilkan: page object di `pages/<Modul>/`, data uji di `data/staging/` (kalau perlu), dan spec di `tests/<role>/<Modul>/NN-<Nama-Flow>.spec.ts`.
Page object `extends BasePage` dan pakai helper yang sudah ada (judul, tombol, tabel, isiTeks), method berbahasa Indonesia (`bukaXxx`, `isiXxx`, `klikXxx`). Spec login lewat `new LoginPage(page).pastikanMasuk('<role>')` di beforeEach. Pakai ulang page object yang sudah ada di `pages/`, jangan buat duplikat. Tulis daftar asumsi singkat di akhir.

Role: polda
Modul: Approval Aduan 
Nama flow: Approval Polda
File rekaman: [ISI: contoh tests/recorded/buat-aduan.spec.ts]
codegen :
import { test, expect } from '@playwright/test';

test.use({
  locale: 'id-ID',
  storageState: 'C:\\\\Users\\\\ADMIN\\\\Downloads\\\\Aduan-Polri-Playwright\\\\.auth\\\\polda.json',
  timezoneId: 'Asia/Jakarta'
});

test('test', async ({ page }) => {
  await page.goto('https://stag-polri.cd9dev.org/');
  await page.goto('https://stag-polri.cd9dev.org/i/home');
  await page.getByRole('button', { name: 'Daftar Aduan ' }).click();
  await page.locator('.ng-tns-c464269736-1.ng-trigger > div:nth-child(3)').first().click();
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(4).click();
  await page.getByRole('button', { name: ' Approve' }).click();
  await page.getByRole('button', { name: 'Ya, Setujui' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
});