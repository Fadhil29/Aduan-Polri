import { test, expect } from '../../../config/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { HalamanAwalPage } from '../../../pages/HalamanAwal/HalamanAwalPage';
import { getData } from '../../../config/testdata';

type HalamanAwal = Record<string, { url: string; judulTab: string }>;
const data = getData<HalamanAwal>('Halaman-Awal').bareskrim;

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('bareskrim');
});

test('bareskrim diarahkan ke halaman awal setelah masuk @smoke', async ({ page }) => {
  /*
    Test Step :
    1. Masuk sebagai bareskrim (beforeEach, pakai sesi .auth/bareskrim.json)
    2. Buka root aplikasi "/"
    3. Validasi diarahkan ke halaman awal bareskrim (URL sesuai data/staging/Halaman-Awal.json)
    4. Validasi judul tab browser dan form login tidak tampil
  */
  const halamanAwal = new HalamanAwalPage(page);
  await halamanAwal.bukaHalamanAwal();

  await expect(page).toHaveURL(new RegExp(data.url));
  await expect(page).toHaveTitle(data.judulTab);
  await expect(new LoginPage(page).tombolLogin()).toBeHidden();
});
