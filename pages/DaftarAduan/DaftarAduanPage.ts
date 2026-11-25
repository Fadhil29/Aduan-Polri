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

  // sel kolom tertentu pada satu baris; indeks dari peta KOLOM, bukan nth() acak
  sel(baris: Locator, kolom: KolomAduan): Locator {
    return baris.locator('td').nth(KOLOM[kolom]);
  }
}
