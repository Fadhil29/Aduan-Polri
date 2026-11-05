# Aduan Polri - Playwright

Project otomasi test untuk aplikasi **Aduan Polri**. Dibaca otomatis oleh Claude Code di folder ini.

## Stack
- Playwright Test + TypeScript. Browser utama: Chromium.
- Konfigurasi di `playwright.config.ts`. URL, environment, dan role dari `.env` (`BASE_URL`, `ENV`, `ROLES`, `<ROLE>_USERNAME`/`_PASSWORD`).

## Struktur folder
```
.auth/                    sesi login per role: <role>.json + <role>.session.json (di-ignore git)
config/env.ts             memuat .env (+ .env.<ENV>), guard ENV=staging
config/roles.ts           daftar ROLES, path sesi, kredensial per role
config/globalSetup.ts     login sekali per role sebelum test, simpan sesi ke .auth/
config/fixtures.ts        `test` yang memulihkan sessionStorage per role
config/testdata.ts        getData('Nama') -> data/<ENV>/Nama.json, autoId() untuk data AUTO-
data/staging/             data uji JSON per flow (fiktif)
pages/LoginPage.ts        page object login (selector masih placeholder, sesuaikan)
pages/<Modul>/XxxPage.ts  satu halaman = satu class
tests/login-check/        cek sesi login tiap role tersimpan (npm run setup)
tests/<role>/<Modul>/     spec final per role, nama file NN-Nama-Flow.spec.ts
tests/public/             spec tanpa login
tests/recorded/           rekaman codegen mentah (DRAFT, tidak dijalankan project role)
tests/seed.spec.ts        seed agent Playwright
specs/                    test plan dari playwright-test-planner
tutor/                    panduan langkah demi langkah untuk tim
```
- `playwright.config.ts` membuat satu project per role per browser (`<role>-chromium`, testDir `tests/<role>`), plus `login-check`, `seed`, dan `public-chromium`. Kalau `ROLES` kosong, semua test di `tests/` jalan di satu project `chromium` tanpa sesi.
- Role aplikasi: `polres`, `polda`, `bareskrim` (folder `tests/polres/`, `tests/polda/`, `tests/bareskrim/`; project `polres-chromium`, dst.).
- Nama role: huruf kecil, tanpa `-` (nama project dipecah di `-` untuk mencari role).
- Test berjalan berurutan (`workers: 1`), urutan file mengikuti nomor `NN-`.

## Aturan keras
1. **Hanya environment staging/uji yang kamu punya izin.** `ENV` harus `staging`. Jangan menjalankan atau merekam di production.
2. **Data fiktif saja.** Aplikasi pengaduan menyimpan data pribadi (pelapor, terlapor, kronologi). Jangan merekam atau menyimpan data asli di spec, screenshot, trace, atau laporan.
3. **Kredensial** hanya di `.env` atau lewat sesi `playwright/.auth/` (keduanya di-ignore git). Jangan tulis username/password/token di kode, log, atau output.
4. Data uji yang dibuat test diberi awalan `AUTO-` supaya mudah dikenali dan dibersihkan (konvensi default; ubah di sini kalau tim punya aturan lain).
5. Jangan mengarang angka (coverage, jumlah defect, persen otomasi). Data tidak ada = "belum terukur".
6. Terus terang soal keterbatasan: kalau sesuatu belum dijalankan atau tidak bisa diverifikasi, bilang.

## Konvensi kode
- Locator prioritas: `getByRole` > `getByLabel` > `getByText` > `getByTestId`. Hindari CSS/XPath panjang dan `nth()`.
- Tanpa `waitForTimeout`. Tunggu kondisi (`expect(...).toBeVisible()`, `waitForResponse`, dll).
- Satu test = satu tujuan jelas; nama test menjelaskan perilaku yang dicek.
- Assertion harus mengecek hasil (isi, status, pesan), bukan cuma elemen tampil.
- Spec memanggil page object, bukan `page.locator(...)`/`getByRole` langsung. `expect` hanya di spec, tidak di page object.
- Data uji lewat `getData()` dari `data/staging/`, tidak di-hardcode di spec. Kredensial hanya dari `process.env`.
- Spec yang butuh login mengimpor `test`/`expect` dari `config/fixtures` dan ditaruh di folder role yang benar; tidak ada langkah login di dalamnya (sudah ditangani globalSetup).
- Komentar `Test Step :` bernomor di awal body test, lalu kode tiap langkah di bawahnya.
- Test yang mengetes halaman login harus mematikan sesi: `test.use({ storageState: { cookies: [], origins: [] } })`.
- Hasil rekaman codegen adalah DRAFT: rapikan locator, tambah assertion, hapus langkah yang tidak perlu sebelum dianggap test.

## Alur kerja
1. Isi `ROLES` + kredensial akun uji di `.env`, sesuaikan selector di `pages/LoginPage.ts`, lalu `npm run setup` (login semua role, cek `.auth/`).
   Login tidak bisa diotomasi (SSO/OTP)? `npm run codegen:auth -- <role>` -> login manual, tutup browser. globalSetup memakai sesi itu kalau kredensial role kosong.
2. `npm run codegen -- nama-fitur --role <role>` -> rekam skenario ke `tests/recorded/`.
3. Rapikan jadi `pages/<Modul>/XxxPage.ts` + `data/staging/<Nama-Flow>.json` + `tests/<role>/<Modul>/NN-<Nama-Flow>.spec.ts`, lalu review dengan agent `qa-reviewer`.
4. `npm test` (atau `npx playwright test --project=<role>-chromium`), `npm run report` untuk melihat laporan.

## Agent di folder ini
- Bawaan Playwright: `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`.
  Healer boleh memperbaiki locator/timing, tetapi jangan melonggarkan assertion supaya hijau. Test yang di-skip healer harus dicek manual: bisa jadi itu bug asli.
- Custom: `test-designer` (desain test case), `qa-reviewer` (review read-only), `bug-triager` (analisis test gagal).

## Konteks yang belum terisi (tanya pemilik project, jangan diasumsikan)
- URL staging dan metode login (SSO / form biasa / tanpa login).
- Hak akses tiap role (menu/aksi/data yang boleh dilihat masing-masing).
- Fitur dan alur utama yang menjadi prioritas, serta area yang baru berubah.
- Riwayat defect dan tenggat waktu.
