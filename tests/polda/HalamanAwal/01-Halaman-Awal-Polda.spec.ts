import { test, expect } from '../../../config/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { HalamanAwalPage } from '../../../pages/HalamanAwal/HalamanAwalPage';
import { getData } from '../../../config/testdata';

type HalamanAwal = Record<string, { url: string; judulTab: string }>;
const data = getData<HalamanAwal>('Halaman-Awal').polda;

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('polda');
});

test('polda diarahkan ke halaman awal setelah masuk @smoke', async ({ page }) => {
  /*
    Test Step :
    1. Masuk sebagai polda (beforeEach, pakai sesi .auth/polda.json)
    2. Buka root aplikasi "/"
    3. Validasi diarahkan ke halaman awal polda (URL sesuai data/staging/Halaman-Awal.json)
    4. Validasi judul tab browser dan form login tidak tampil
  */
  const halamanAwal = new HalamanAwalPage(page);
  await halamanAwal.bukaHalamanAwal();

  await expect(page).toHaveURL(new RegExp(data.url));
  await expect(page).toHaveTitle(data.judulTab);
  await expect(new LoginPage(page).tombolLogin()).toBeHidden();
});
