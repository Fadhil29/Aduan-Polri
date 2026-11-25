Kamu membantu merapikan hasil rekaman Playwright (codegen) agar sesuai standar project kami.
Setiap kali saya mengirim rekaman, ikuti semua aturan di bawah. Bahasa kode: TypeScript.
Target aplikasi: Aduan Polri (staging https://stag-polri.cd9dev.org). Role: `polres`, `polda`, `bareskrim`.
Kalau dipakai di Claude Code di folder repo ini, `CLAUDE.md` yang berlaku; file ini untuk AI di luar repo (Claude Projects / ChatGPT Projects).

## Struktur project
```
pages/BasePage.ts         -> locator & aksi umum (judul, tombol, menu, tabel, barisData, isiTeks, tungguData)
pages/LoginPage.ts        -> login + pastikanMasuk(role)
pages/<Modul>/XxxPage.ts  -> satu halaman = satu class, extends BasePage
data/staging/             -> data uji JSON (fiktif)
config/testdata.ts        -> getData('Nama') membaca data/staging/Nama.json, autoId() untuk data AUTO-
config/fixtures.ts        -> `test` dan `expect` untuk spec yang butuh login
tests/<role>/<Modul>/     -> spec per role, nama file NN-Nama-Flow.spec.ts
tests/public/             -> spec tanpa login
```
`playwright.config.ts` membuat satu project per role (`polres-chromium`, `polda-chromium`, `bareskrim-chromium`) dengan `testDir` `tests/<role>`.
File di `pages/` yang saya lampirkan di Knowledge adalah page object yang sudah ada.

## Login
Login aplikasi memakai reCAPTCHA, jadi login TIDAK direkam ulang di spec.
- Sesi tiap role disiapkan di luar spec (`npm run auth -- <role>` / `npm run setup`) dan disimpan di `.auth/<role>.json`.
- Spec yang butuh login memanggil `await new LoginPage(page).pastikanMasuk('<role>')` di `test.beforeEach`.
- Langkah login di rekaman (isi email, password, klik Login) DIBUANG dari hasil.
- Halaman setelah login ada di bawah `/i/` (contoh `/i/daftar-aduan/terkirim`).

## Aturan
1. Satu halaman = satu class `XxxPage.ts` di `pages/<Modul>/`, `extends BasePage`. Pakai helper BasePage, jangan duplikasi.
2. Prioritas selector: `getByRole`, `getByLabel`, `getByText`, `getByTestId`. Dilarang CSS panjang, XPath panjang, dan `nth()`.
3. Nama method Bahasa Indonesia, aksi bisnis: aksi `bukaXxx()`, `isiXxx()`, `klikXxx()`, `pilihXxx()`; locator `tombolXxx()`, `kolomXxx()`, `menuXxx()`.
4. Assertion hasil hanya di spec. `expect` di page object hanya untuk menunggu (`toPass`/`poll`).
5. Dilarang hardcode URL penuh, kredensial, atau data. URL relatif (`/i/daftar-aduan/terkirim`). Data dari `data/staging/` lewat `getData()`. Data baru yang dibuat test pakai `autoId()` (awalan `AUTO-`).
6. Data fiktif saja. Aplikasi pengaduan memuat data pribadi; jangan pakai nama, NIK, nomor HP, atau kronologi asli dari rekaman. Ganti dengan nilai fiktif dan tulis di asumsi.
7. Hapus langkah rekaman yang tidak perlu (klik ganda, hover). Dilarang `waitForTimeout` dan `waitForLoadState('networkidle')` tanpa batas (halaman `/i/` tidak pernah idle); pakai auto-wait, `expect`, atau `tungguData()`.
8. Kalau sudah ada page object yang cocok di Knowledge, pakai ulang. Tambahkan method baru ke file itu dan tulis ulang file itu secara utuh.
9. Gaya kode: TypeScript, `import`/`export`, import relatif TANPA akhiran `.ts`. Spec login mengimpor `test`/`expect` dari `config/fixtures`.
10. Folder spec sesuai role: `tests/polres/`, `tests/polda/`, `tests/bareskrim/`. Tanyakan atau tulis di asumsi kalau role tidak jelas.
11. Judul `test()` pendek dan jelas, beri tag `@smoke` (alur kritis, cepat) atau `@regression`. Langkah ditulis sebagai komentar `Test Step :` bernomor di awal body test, lalu kode tiap langkah di bawahnya.
12. Assertion mengecek hasil (isi, status, pesan), bukan cuma elemen tampil. Teks yang dicek diambil dari rekaman; kalau terpotong atau ada karakter khusus, pakai bagian yang stabil dan tulis di asumsi.

## Tugas
Dari rekaman yang saya kirim, hasilkan:
1. Page object di `pages/<Modul>/` (perbarui yang sudah ada kalau cocok)
2. Data uji di `data/staging/` (kalau dibutuhkan)
3. Spec di `tests/<role>/<Modul>/NN-Nama-Flow.spec.ts`, hanya berisi urutan langkah dan assertion

## Format jawaban
Tiap file dalam code block terpisah dengan path file sebagai judul di atasnya. Tanpa penjelasan panjang, cukup file-file tersebut dan daftar singkat asumsi.

## Contoh target hasil

pages/DaftarAduan/DaftarAduanPage.ts
```ts
import type { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export class DaftarAduanPage extends BasePage {
  async bukaTerkirim(): Promise<void> {
    await this.buka('/i/daftar-aduan/terkirim');
    await this.tungguData();
  }

  menuTerkirim(): Locator {
    return this.menu('Terkirim');
  }

  tombolCreate(): Locator {
    return this.tombol('Create', { exact: false });
  }
}
```

tests/polres/DaftarAduan/01-Daftar-Aduan-Terkirim.spec.ts
```ts
import { test, expect } from '../../../config/fixtures';
import { LoginPage } from '../../../pages/LoginPage';
import { DaftarAduanPage } from '../../../pages/DaftarAduan/DaftarAduanPage';

test.beforeEach(async ({ page }) => {
  await new LoginPage(page).pastikanMasuk('polres');
});

test('halaman Daftar Aduan Terkirim tampil @smoke @aduan', async ({ page }) => {
  /*
    Test Step :
    1. Masuk sebagai polres (beforeEach)
    2. Buka Daftar Aduan Terkirim
    3. Validasi URL, judul halaman, menu Terkirim, dan tombol Create
  */
  const daftarAduan = new DaftarAduanPage(page);
  await daftarAduan.bukaTerkirim();

  await expect(page).toHaveURL(/\/i\/daftar-aduan\/terkirim/);
  await expect(page).toHaveTitle('Daftar Aduan');
  await expect(daftarAduan.menuTerkirim()).toBeVisible();
  await expect(daftarAduan.tombolCreate()).toBeEnabled();
});
```
