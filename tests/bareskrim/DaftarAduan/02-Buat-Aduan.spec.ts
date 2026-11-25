import { test, expect } from '../../../config/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { BuatAduanPage } from '../../../pages/DaftarAduan/BuatAduanPage';
import { DaftarAduanPage } from '../../../pages/DaftarAduan/DaftarAduanPage';
import { getData, autoId, fileUpload } from '../../../config/testdata';

type DataBuatAduan = {
  kategori: string;
  statusSetelahKirim: Record<string, string>;
  url: { platform: string; link: string; keterangan: string; dasarHukum: string };
};
const data = getData<DataBuatAduan>('Buat-Aduan');

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('bareskrim');
});

test('bareskrim bisa membuat dan mengirim aduan baru @regression @aduan', async ({ page }) => {
  /*
    Test Step :
    1. Masuk sebagai bareskrim (beforeEach)
    2. Buka form buat aduan
    3. Isi judul dan nomor surat unik (AUTO-), upload file surat (PDF), pilih kategori
    4. Tambah URL terlapor: platform, link, bukti gambar, keterangan, dasar hukum
    5. Klik Submit lalu konfirmasi Ya, Kirim, tunggu sampai keluar dari form
    6. Buka Daftar Aduan Terkirim
    7. Validasi baris pertama tabel = aduan barusan: nomor surat, judul, kategori, status setelah kirim (data.statusSetelahKirim.bareskrim), nomor tiket
  */
  const buatAduan = new BuatAduanPage(page);
  const daftarAduan = new DaftarAduanPage(page);
  const judul = autoId('AUTO-ADUAN-BARESKRIM');
  const nomorSurat = autoId('AUTO-SURAT');
  const fileSurat = fileUpload('UPLOAD_SURAT_PDF');
  const fileBukti = fileUpload('UPLOAD_BUKTI_IMG');

  await buatAduan.bukaForm();

  await buatAduan.isiJudul(judul);
  await buatAduan.isiNomorSurat(nomorSurat);
  await buatAduan.uploadSurat(fileSurat);
  await buatAduan.pilihKategori(data.kategori);

  await buatAduan.tambahUrl({ ...data.url, fileBukti });
  await expect(page.getByText(data.url.link)).toBeVisible();

  await buatAduan.klikSubmit();
  await buatAduan.konfirmasiKirim();

  await daftarAduan.bukaTerkirim();
  const baris = daftarAduan.barisPertama();
  await expect(daftarAduan.sel(baris, 'judul')).toHaveText(judul);
  await expect(daftarAduan.sel(baris, 'nomorSurat')).toHaveText(nomorSurat);
  await expect(daftarAduan.sel(baris, 'kategori')).toHaveText(data.kategori);
  await expect(daftarAduan.sel(baris, 'status')).toHaveText(data.statusSetelahKirim.bareskrim);
  await expect(daftarAduan.sel(baris, 'nomorTiket')).toHaveText(/TKP\d+/);
});
