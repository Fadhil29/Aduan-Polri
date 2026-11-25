import { expect, type Locator, type Page } from '@playwright/test';

// aksi & locator umum yang dipakai banyak halaman. page object lain cukup `extends BasePage`.
// kalau satu modul punya banyak halaman mirip (filter, tabel, paginasi sama), buat base per modul,
// contoh pages/Aduan/AduanBasePage.ts extends BasePage, lalu halaman modul itu extends AduanBasePage.
export class BasePage {
  constructor(protected readonly page: Page) {}

  // tidak menunggu event "load": aset pihak ketiga (reCAPTCHA, font) bisa bikin load lama/menggantung.
  // kesiapan halaman dicek lewat elemen yang ditunggu sesudahnya.
  async buka(alamat: string): Promise<void> {
    await this.page.goto(alamat, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }

  judul(teks: string, { exact = true } = {}): Locator {
    return this.page.getByRole('heading', { name: teks, exact }).first();
  }

  teks(konten: string | RegExp): Locator {
    return this.page.getByText(konten).first();
  }

  tombol(nama: string | RegExp, { exact = true } = {}): Locator {
    return this.page.getByRole('button', { name: nama, exact });
  }

  menu(nama: string | RegExp, { exact = true } = {}): Locator {
    return this.page.getByRole('link', { name: nama, exact });
  }

  tabel(): Locator {
    return this.page.getByRole('table');
  }

  // baris berisi data (tanpa header dan baris "tidak ada data")
  barisData(): Locator {
    return this.tabel()
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell') })
      .filter({ hasNotText: /tidak ada data/i });
  }

  // tunggu request awal reda, maksimal 5 detik. halaman di /i/ (polres/polda) terus mengirim request
  // di latar, jadi "networkidle" bisa tidak pernah tercapai. kesiapan data tetap dicek lewat expect di spec.
  async tungguData(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  }

  // isi kolom teks dan pastikan nilainya tidak terhapus render ulang (umum di Angular)
  async isiTeks(kolom: Locator, nilai: string): Promise<void> {
    await expect(async () => {
      await kolom.fill(nilai);
      await expect(kolom).toHaveValue(nilai, { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  }

  // isi satu kolom tabel di semua baris (indeks 0 = kolom pertama)
  async isiSel(indeks: number): Promise<string[]> {
    return this.barisData().evaluateAll(
      (baris, i) => baris.map((b) => b.querySelectorAll('td')[i]?.textContent?.trim() ?? ''),
      indeks,
    );
  }
}
