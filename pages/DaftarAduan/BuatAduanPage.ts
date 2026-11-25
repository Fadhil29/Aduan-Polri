import type { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export type DataUrlAduan = {
  platform: string;
  link: string;
  fileBukti: string;
  keterangan: string;
  dasarHukum: string;
};

// form buat aduan (draft/add). URL terlapor diisi lewat dialog "Add URL".
export class BuatAduanPage extends BasePage {
  async bukaForm(): Promise<void> {
    await this.buka('/i/daftar-aduan/draft/add');
    await this.kolomJudul().waitFor();
  }

  kolomJudul(): Locator {
    return this.page.getByRole('textbox', { name: 'Masukkan judul aduan' });
  }

  kolomNomorSurat(): Locator {
    return this.page.getByRole('textbox', { name: 'Masukkan nomor surat' });
  }

  dropdownKategori(): Locator {
    return this.page.getByRole('combobox', { name: 'Pilih kategori aduan...' });
  }

  // nama aksesibel tombol diawali karakter ikon, jadi tidak pakai exact
  tombolAddUrl(): Locator {
    return this.tombol('Add URL', { exact: false });
  }

  tombolSubmit(): Locator {
    return this.tombol('Submit', { exact: false });
  }

  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async isiJudul(judul: string): Promise<void> {
    await this.isiTeks(this.kolomJudul(), judul);
  }

  async isiNomorSurat(nomor: string): Promise<void> {
    await this.isiTeks(this.kolomNomorSurat(), nomor);
  }

  // dari rekaman: tombol "Upload file surat" dibuka dulu, baru area "Browse Files" muncul
  async uploadSurat(file: string): Promise<void> {
    await this.page.getByRole('button').filter({ hasText: 'Upload file surat' }).click();
    // dialog Add URL belum terbuka, jadi label "Browse Files" di sini milik upload surat
    await this.page.getByLabel('Browse Files').setInputFiles(file);
  }

  async pilihKategori(kategori: string): Promise<void> {
    await this.dropdownKategori().click();
    await this.page.getByRole('option', { name: kategori, exact: true }).click();
  }

  async tambahUrl(data: DataUrlAduan): Promise<void> {
    await this.tombolAddUrl().click();
    const dialog = this.dialog();

    await dialog.getByRole('combobox', { name: 'Pilih jenis platform...' }).click();
    await this.page.getByRole('option', { name: data.platform, exact: true }).click();
    await this.isiTeks(dialog.getByRole('textbox', { name: 'www.link.com' }), data.link);
    await dialog.getByLabel('Drag & drop atau Browse Files').setInputFiles(data.fileBukti);
    await this.isiTeks(dialog.getByRole('textbox', { name: 'Terjadi penipuan' }), data.keterangan);

    // teks opsi dasar hukum panjang (isi pasal), dicari lewat potongan yang stabil
    await dialog.getByRole('combobox', { name: 'Pilih dasar hukum...' }).click();
    // .first(): teks pasal yang sama bisa muncul di judul opsi dan isi pasalnya
    await this.page.getByText(data.dasarHukum).first().click();

    await dialog.getByRole('button', { name: 'Add URL' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async klikSubmit(): Promise<void> {
    await this.tombolSubmit().click();
  }

  // tunggu sampai aplikasi meninggalkan form (aduan tersimpan). tanpa ini, navigasi berikutnya
  // bisa membatalkan request simpan yang masih berjalan.
  async konfirmasiKirim(): Promise<void> {
    await this.tombol('Ya, Kirim').click();
    await this.page.waitForURL((url) => !url.pathname.endsWith('/draft/add'), { timeout: 30_000 });
  }
}
