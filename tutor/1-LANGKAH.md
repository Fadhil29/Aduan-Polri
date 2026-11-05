# Cara Membuat Test dari Rekaman (Aduan Polri)

Ikuti dari atas ke bawah. Bagian A sekali di awal, bagian B diulang tiap flow.

## A. PERSIAPAN

1. `npm install` lalu `npx playwright install chromium`. Di VS Code, install extension Playwright kalau ditawari.
2. Salin `.env.example` jadi `.env`, isi:
   ```
   ENV=staging
   BASE_URL=https://<url-staging>
   ROLES=polres,polda,bareskrim
   POLRES_USERNAME=...
   POLRES_PASSWORD=...
   POLDA_USERNAME=...
   POLDA_PASSWORD=...
   BARESKRIM_USERNAME=...
   BARESKRIM_PASSWORD=...
   ```
   Nama role huruf kecil tanpa `-`. Folder `tests/polres/`, `tests/polda/`, `tests/bareskrim/` sudah ada.
   Aplikasi tanpa login: biarkan `ROLES=` kosong, taruh test langsung di `tests/`.
3. Sesuaikan selector di `pages/LoginPage.ts` (kolom username, password, tombol masuk, dan `waitForLoggedIn()` yang menandai login berhasil). Ambil lewat **Pick locator** di panel Playwright atau `npm run codegen -- login --no-auth`.
4. `npm run setup`. Berhasil kalau `.auth/<role>.json` terbentuk dan `login-check` lolos.
   Gagal? Lihat `test-results/login-gagal-<role>.png`.
   Login pakai SSO/OTP: kosongkan kredensial role itu, jalankan `npm run codegen:auth -- <role>`, login manual, tutup browser.

## B. MEMBUAT TEST BARU

5. Rekam: `npm run codegen -- buat-aduan --role polres`. Hasil di `tests/recorded/buat-aduan.spec.ts`.
   Atau dari VS Code: centang satu project (`polres-chromium`), klik **Record new**.
6. Rapikan (bisa minta Claude Code, kirim pesan dari `tutor/3-PESAN-PER-FLOW.md`). Hasilnya:

   | File | Isi |
   |---|---|
   | `pages/<Modul>/BuatAduanPage.ts` | locator + aksi bisnis, tanpa `expect` |
   | `data/staging/Buat-Aduan.json` | data uji fiktif |
   | `tests/polres/<Modul>/01-Buat-Aduan.spec.ts` | urutan langkah + assertion |

7. Jalankan 2x berturut-turut: `npx playwright test tests/polres --project=polres-chromium`. Keduanya harus lolos.
8. Review dengan agent `qa-reviewer`, lalu hapus draft di `tests/recorded/`.

## CHECKLIST REVIEW
- [ ] Tidak ada URL penuh, `nth()`, atau `waitForTimeout` di spec
- [ ] Spec memanggil page object, bukan locator langsung
- [ ] Tidak ada kredensial/data hardcoded (data lewat `getData()`, data baru berawalan `AUTO-`)
- [ ] Minimal satu `expect` yang mengecek hasil (isi, status, pesan)
- [ ] Spec di folder role yang benar, tanpa langkah login
- [ ] Test login mematikan sesi: `test.use({ storageState: { cookies: [], origins: [] } })`

Contoh spec:
```ts
import { test, expect } from '../../../config/fixtures';
import { BuatAduanPage } from '../../../pages/Aduan/BuatAduanPage';
import { getData, autoId } from '../../../config/testdata';

const data = getData<{ kategori: string; pesanSukses: string }>('Buat-Aduan');

test('polres bisa membuat aduan baru', async ({ page }) => {
  /*
    Test Step :
    1. Buka halaman buat aduan
    2. Isi judul unik dan kategori, kirim
    3. Validasi pesan sukses dan aduan muncul di daftar
  */
  const aduanPage = new BuatAduanPage(page);
  const judul = autoId();

  await aduanPage.goto();
  await aduanPage.buatAduan(judul, data.kategori);
  await expect(aduanPage.pesanNotifikasi()).toHaveText(data.pesanSukses);
  await expect(aduanPage.barisAduan(judul)).toBeVisible();
});
```
(Nama halaman, field, dan pesan di contoh ini fiktif, sesuaikan dengan aplikasi asli.)

## TROUBLESHOOTING
| Masalah | Cek |
|---|---|
| `ENV bukan "staging"` | isi `ENV=staging` di `.env` |
| `Login role "x" gagal` | selector `pages/LoginPage.ts`, akun di `.env`, screenshot di `test-results/` |
| Rekaman terbuka di halaman login | `.auth/<role>.json` belum ada, jalankan `npm run setup` |
| `No tests found` | spec belum dipindah dari `tests/recorded/` ke `tests/<role>/`, atau project yang dipilih salah |
| Lolos sekali, gagal berikutnya | data bentrok, pakai `autoId()` |
| `File data tidak ada: data/staging/...` | file JSON belum dibuat |
