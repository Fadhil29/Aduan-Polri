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
type DataApproval = { statusSetelahApprovePolda: string; statusSetelahApproveBareskrim: string };
const buat = getData<DataBuatAduan>('Buat-Aduan');
const data = getData<DataApproval>('Approval-Aduan');

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('bareskrim');
});

test('bareskrim bisa approve aduan polres yang sudah disetujui polda @regression @aduan @approval', async ({ page, browser }) => {
  /*
    Test Step :
    1. Prasyarat: polres membuat dan mengirim aduan baru (AUTO-), lalu polda meng-approve (context terpisah)
    2. Masuk sebagai bareskrim (beforeEach), buka Daftar Aduan > Approval
    3. Validasi aduan muncul dengan status Approval Bareskrim
    4. Buka detail aduan (ikon mata), klik Approve, konfirmasi Ya, Setujui, tutup popup OK
    5. Validasi di Terkirim polres: status aduan berubah jadi Diproses
  */
  test.setTimeout(180_000); // termasuk prasyarat polres membuat dan polda meng-approve
  const judul = autoId('AUTO-ADUAN-POLRES');
  const nomorSurat = autoId('AUTO-SURAT');

  const polres = await contextRole(browser, 'polres');
  const polda = await contextRole(browser, 'polda');
  try {
    // 1. prasyarat: alur polres -> polda, supaya test ini tidak bergantung pada test lain
    const halamanPolres = await polres.newPage();
    await new BuatAduanPage(halamanPolres).buatDanKirim({
      judul,
      nomorSurat,
      fileSurat: fileUpload('UPLOAD_SURAT_PDF'),
      kategori: buat.kategori,
      url: { ...buat.url, fileBukti: fileUpload('UPLOAD_BUKTI_IMG') },
    });
    const halamanPolda = await polda.newPage();
    await new DaftarAduanPage(halamanPolda).bukaDetailApproval(judul);
    await new DetailAduanPage(halamanPolda).approve();

    // 2-3. bareskrim melihat aduan di menu Approval
    const daftarBareskrim = new DaftarAduanPage(page);
    await daftarBareskrim.bukaApproval();
    const baris = daftarBareskrim.barisAduan(judul);
    await expect(baris).toBeVisible();
    await expect(daftarBareskrim.sel(baris, 'nomorSurat')).toHaveText(nomorSurat);
    await expect(daftarBareskrim.sel(baris, 'status')).toHaveText(data.statusSetelahApprovePolda);

    // 4. approve dari halaman detail
    await daftarBareskrim.klikLihat(baris);
    await new DetailAduanPage(page).approve();

    // 5. hasil dicek dari sisi pembuat (polres)
    const daftarPolres = new DaftarAduanPage(halamanPolres);
    await daftarPolres.bukaTerkirim();
    await expect(daftarPolres.sel(daftarPolres.barisAduan(judul), 'status')).toHaveText(data.statusSetelahApproveBareskrim);
  } finally {
    await polres.close();
    await polda.close();
  }
});
