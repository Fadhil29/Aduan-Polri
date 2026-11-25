import { test, expect } from '../../../config/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { DaftarAduanPage } from '../../../pages/DaftarAduan/DaftarAduanPage';

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('polres');
});

test.describe('Daftar Aduan - polres @smoke @aduan', () => {
  test('halaman Daftar Aduan Terkirim terbuka dengan sesi polres', async ({ page }) => {
    /*
      Test Step :
      1. Masuk sebagai polres (beforeEach)
      2. Buka /i/daftar-aduan/terkirim
      3. Validasi tidak dilempar ke login dan judul halaman "Daftar Aduan"
      4. Validasi menu Terkirim, tombol Create, Download, dan paginasi tersedia
    */
    const daftarAduan = new DaftarAduanPage(page);
    await daftarAduan.bukaTerkirim();

    await expect(page).toHaveURL(/\/i\/daftar-aduan\/terkirim/);
    await expect(page).toHaveTitle('Daftar Aduan');
    await expect(new LoginPage(page).tombolLogin()).toBeHidden();
    await expect(daftarAduan.menuTerkirim()).toBeVisible();
    await expect(daftarAduan.tombolCreate()).toBeEnabled();
    await expect(daftarAduan.tombolDownload()).toBeVisible();
    await expect(daftarAduan.tombolHalamanBerikutnya()).toBeVisible();
  });
});
