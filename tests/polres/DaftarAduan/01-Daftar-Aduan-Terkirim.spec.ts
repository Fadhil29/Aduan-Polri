import { test, expect } from '../../../config/fixtures';
import { DaftarAduanPage } from '../../../pages/DaftarAduan/DaftarAduanPage';

test.describe('Daftar Aduan - polres @smoke @aduan', () => {
  test('halaman Daftar Aduan Terkirim terbuka dengan sesi polres', async ({ page }) => {
    // Test Step :
    // 1. buka /i/daftar-aduan/terkirim memakai sesi polres
    // 2. pastikan tidak dilempar ke login dan judul halaman "Daftar Aduan"
    // 3. pastikan menu Terkirim, tombol Create, Download, dan paginasi tersedia
    const daftarAduan = new DaftarAduanPage(page);
    await daftarAduan.gotoTerkirim();

    await expect(page).toHaveURL(/\/i\/daftar-aduan\/terkirim/);
    await expect(page).toHaveTitle('Daftar Aduan');
    await expect(daftarAduan.loginButton()).toBeHidden();
    await expect(daftarAduan.terkirimLink()).toBeVisible();
    await expect(daftarAduan.createButton()).toBeEnabled();
    await expect(daftarAduan.downloadButton()).toBeVisible();
    await expect(daftarAduan.nextPageButton()).toBeVisible();
  });
});
