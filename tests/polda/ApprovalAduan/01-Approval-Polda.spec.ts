import { test, expect, contextRole } from '../../../config/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { BuatAduanPage } from '../../../pages/DaftarAduan/BuatAduanPage';
import { DaftarAduanPage } from '../../../pages/DaftarAduan/DaftarAduanPage';
import { DetailAduanPage } from '../../../pages/DaftarAduan/DetailAduanPage';
import { getData, autoId, fileUpload } from '../../../config/testdata';

type DataBuatAduan = {
  kategori: string;
  url: { platform: string; link: string; keterangan: string; dasarHukum: string };
};
type DataApproval = { statusMenungguPolda: string; statusSetelahApprovePolda: string };
const buat = getData<DataBuatAduan>('Buat-Aduan');
const data = getData<DataApproval>('Approval-Aduan');

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('polda');
});

test('polda bisa approve aduan dari polres @regression @aduan @approval', async ({ page, browser }) => {
  /*
    Test Step :
    1. Prasyarat: polres membuat dan mengirim aduan baru (AUTO-) di context terpisah
    2. Masuk sebagai polda (beforeEach), buka Daftar Aduan > Approval
    3. Validasi aduan dari polres muncul dengan status Approval Polda
    4. Buka detail aduan (ikon mata), klik Approve, konfirmasi Ya, Setujui, tutup popup OK
    5. Validasi di Terkirim polres: status aduan berubah jadi Approval Bareskrim
  */
  test.setTimeout(120_000); // termasuk membuat aduan prasyarat sebagai polres
  const judul = autoId('AUTO-ADUAN-POLRES');
  const nomorSurat = autoId('AUTO-SURAT');

  // 1. prasyarat dibuat polres, supaya test ini tidak bergantung pada test lain
  const polres = await contextRole(browser, 'polres');
  const halamanPolres = await polres.newPage();
  try {
    await new BuatAduanPage(halamanPolres).buatDanKirim({
      judul,
      nomorSurat,
      fileSurat: fileUpload('UPLOAD_SURAT_PDF'),
      kategori: buat.kategori,
      url: { ...buat.url, fileBukti: fileUpload('UPLOAD_BUKTI_IMG') },
    });

    // 2-3. polda melihat aduan di menu Approval
    const daftarPolda = new DaftarAduanPage(page);
    await daftarPolda.bukaApproval();
    const baris = daftarPolda.barisAduan(judul);
    await expect(baris).toBeVisible();
    await expect(daftarPolda.sel(baris, 'nomorSurat')).toHaveText(nomorSurat);
    await expect(daftarPolda.sel(baris, 'status')).toHaveText(data.statusMenungguPolda);

    // 4. approve dari halaman detail
    await daftarPolda.klikLihat(baris);
    const detail = new DetailAduanPage(page);
    await detail.approve();

    // 5. hasil dicek dari sisi pembuat (polres)
    const daftarPolres = new DaftarAduanPage(halamanPolres);
    await daftarPolres.bukaTerkirim();
    const barisPolres = daftarPolres.barisAduan(judul);
    await expect(daftarPolres.sel(barisPolres, 'status')).toHaveText(data.statusSetelahApprovePolda);
  } finally {
    await polres.close();
  }
});
