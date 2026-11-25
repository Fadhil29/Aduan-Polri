import type { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

// urutan kolom tabel Daftar Aduan (indeks td): No Surat, No Tiket, Satuan, Prioritas, Judul,
// Kategori, Tanggal, Status, indikator, Aksi
const KOLOM = { nomorSurat: 0, nomorTiket: 1, satuan: 2, prioritas: 3, judul: 4, kategori: 5, tanggal: 6, status: 7 } as const;
export type KolomAduan = keyof typeof KOLOM;

export class DaftarAduanPage extends BasePage {
  async bukaTerkirim(): Promise<void> {
    await this.buka('/i/daftar-aduan/terkirim');
    await this.tungguData();
  }

  menuTerkirim(): Locator {
    return this.menu('Terkirim');
  }

  // sub-menu di bawah "Daftar Aduan" berupa div (bukan link), dicari lewat teks persis di dalam sidebar.
  // teks yang sama juga muncul di luar sidebar, jadi harus dibatasi ke area sidebar.
  subMenu(nama: string): Locator {
    return this.page.getByRole('complementary').getByText(nama, { exact: true });
  }

  // buka sub-menu lewat sidebar (URL sub-menu Approval belum diketahui)
  async bukaSubMenu(nama: string): Promise<void> {
    if (!(await this.subMenu(nama).isVisible())) {
      await this.tombol('Daftar Aduan', { exact: false }).click();
    }
    await this.subMenu(nama).click();
    await this.tabel().waitFor();
    await this.tungguData();
  }

  async bukaApproval(): Promise<void> {
    await this.buka('/i/home');
    await this.bukaSubMenu('Approval');
  }

  // nama aksesibel diawali karakter ikon, jadi tidak pakai exact
  tombolCreate(): Locator {
    return this.tombol('Create', { exact: false });
  }

  tombolDownload(): Locator {
    return this.tombol('Download', { exact: false });
  }

  tombolHalamanBerikutnya(): Locator {
    return this.tombol('Next Page');
  }

  async klikCreate(): Promise<void> {
    await this.tombolCreate().click();
  }

  // baris aduan di tabel berdasarkan judul
  barisAduan(judul: string): Locator {
    return this.barisData().filter({ hasText: judul });
  }

  // baris teratas = aduan terbaru (tabel terurut dari yang terbaru)
  barisPertama(): Locator {
    return this.barisData().first();
  }

  // ikon mata (lihat detail) di kolom Aksi; satu-satunya tombol di baris
  tombolLihat(baris: Locator): Locator {
    return baris.getByRole('button');
  }

  async klikLihat(baris: Locator): Promise<void> {
    await this.tombolLihat(baris).click();
  }

  // buka menu Approval, cari aduan berdasarkan judul, lalu buka detailnya
  async bukaDetailApproval(judul: string): Promise<void> {
    await this.bukaApproval();
    await this.klikLihat(this.barisAduan(judul));
  }

  // sel kolom tertentu pada satu baris; indeks dari peta KOLOM, bukan nth() acak
  sel(baris: Locator, kolom: KolomAduan): Locator {
    return baris.locator('td').nth(KOLOM[kolom]);
  }
}
