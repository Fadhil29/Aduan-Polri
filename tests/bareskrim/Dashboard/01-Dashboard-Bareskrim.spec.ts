import { test, expect } from '../../../config/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { DashboardPage } from '../../../pages/Dashboard/DashboardPage';
import { getData } from '../../../config/testdata';

const data = getData<{ judul: string }>('Dashboard');

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('bareskrim');
});

test('bareskrim bisa membuka dashboard @smoke', async ({ page }) => {
  /*
    Test Step :
    1. Masuk sebagai bareskrim (beforeEach, pakai sesi .auth/bareskrim.json)
    2. Buka dashboard
    3. Validasi tidak dilempar ke halaman login
    4. Validasi judul dashboard tampil (kalau data/staging/Dashboard.json sudah diisi)
  */
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await dashboardPage.bukaDashboard();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(loginPage.tombolLogin()).toBeHidden();

  test.skip(!data.judul, 'isi "judul" di data/staging/Dashboard.json dengan judul dashboard staging');
  await expect(dashboardPage.judul(data.judul)).toBeVisible();
});
