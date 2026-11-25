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
pages/BasePage.ts         locator & aksi umum (judul, tombol, tabel, isiTeks, ...), semua page extends ini
pages/LoginPage.ts        login: isiEmail, isiPassword, klikLogin, login, pastikanMasuk(role)
pages/<Modul>/XxxPage.ts  satu halaman = satu class, contoh pages/DaftarAduan/DaftarAduanPage.ts
pages/HalamanAwal/        acuan halaman setelah login (tidak ada dashboard; polres -> /i/daftar-aduan/terkirim)
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
3. **Kredensial** hanya di `.env` atau lewat sesi `.auth/` (keduanya di-ignore git). Jangan tulis username/password/token di kode, log, atau output.
4. Data uji yang dibuat test diberi awalan `AUTO-` supaya mudah dikenali dan dibersihkan (konvensi default; ubah di sini kalau tim punya aturan lain).
5. Jangan mengarang angka (coverage, jumlah defect, persen otomasi). Data tidak ada = "belum terukur".
6. Terus terang soal keterbatasan: kalau sesuatu belum dijalankan atau tidak bisa diverifikasi, bilang.

## Konvensi kode
- Locator prioritas: `getByRole` > `getByLabel` > `getByText` > `getByTestId`. Hindari CSS/XPath panjang dan `nth()`.
- Tanpa `waitForTimeout`. Tunggu kondisi (`expect(...).toBeVisible()`, `waitForResponse`, dll).
- Jangan `waitForLoadState('networkidle')` tanpa batas: halaman di `/i/` (polres/polda) terus mengirim request di latar sehingga tidak pernah idle dan test menggantung sampai timeout. Pakai `BasePage.tungguData()` (maks 5 detik) atau tunggu elemen tertentu.
- Satu test = satu tujuan jelas; nama test menjelaskan perilaku yang dicek.
- Assertion harus mengecek hasil (isi, status, pesan), bukan cuma elemen tampil.
- Spec memanggil page object, bukan `page.locator(...)`/`getByRole` langsung. Assertion hasil hanya di spec; `expect` di page object cuma untuk menunggu (`toPass`/`poll`).
- Page object `extends BasePage` (atau base per modul, contoh `pages/Aduan/AduanBasePage.ts`, kalau beberapa halaman satu modul berbagi filter/tabel yang sama). Jangan duplikasi helper yang sudah ada di BasePage.
- Nama method pakai Bahasa Indonesia dan aksi bisnis, pola Komdigi: aksi `bukaXxx()`, `isiXxx()`, `klikXxx()`, `pilihXxx()`; locator `tombolXxx()`, `kolomXxx()`, `judul()`. Bukan `clickButton3()`.
- Spec yang butuh login memanggil `new LoginPage(page).pastikanMasuk('<role>')` di `beforeEach`.
- Data uji lewat `getData()` dari `data/staging/`, tidak di-hardcode di spec. Kredensial hanya dari `process.env`.
- Spec yang butuh login mengimpor `test`/`expect` dari `config/fixtures` dan ditaruh di folder role yang benar; tidak ada langkah login di dalamnya (sudah ditangani globalSetup).
- Komentar `Test Step :` bernomor di awal body test, lalu kode tiap langkah di bawahnya.
- Test yang mengetes halaman login harus mematikan sesi: `test.use({ storageState: { cookies: [], origins: [] } })`.
- Hasil rekaman codegen adalah DRAFT: rapikan locator, tambah assertion, hapus langkah yang tidak perlu sebelum dianggap test.
- Tag di judul test/describe: `@smoke` (alur kritis, cepat) atau `@regression`. Jalankan: `npm run test:smoke` / `npm run test:regression`. Tag tambahan per modul boleh (contoh `@aduan`).
- Prioritaskan test berdasarkan risiko (area yang berubah atau berdampak tinggi), bukan merata ke semua fitur.
- Sebelum commit: `npm run typecheck` harus bersih. (Lint ESLint belum dipasang: `typescript-eslint` belum mendukung TypeScript 7.)

## CI (GitHub Actions)
- Workflow: `.github/workflows/playwright.yml`, dijalankan manual (`workflow_dispatch`) dengan input tag.
- Login manual (captcha/OTP) tidak bisa otomatis di CI. Sesi `.auth/<role>.json` (+ `.session.json`) di-encode base64 dan disimpan sebagai GitHub Secret (`AUTH_<ROLE>_B64`, `AUTH_<ROLE>_SESSION_B64`), plus `BASE_URL`. Sesi kedaluwarsa, jadi secret perlu diperbarui berkala.
- Staging yang hanya bisa diakses dari jaringan internal/VPN tidak terjangkau `ubuntu-latest`: pakai self-hosted runner.
- Laporan/trace/screenshot bisa memuat data aplikasi: repo harus private, retensi artifact pendek.

## Skills di folder ini
- `aduan-polri-qa`: alur menulis test, checklist review, debug. Buatan sendiri, mengikuti file ini.
- `playwright-core`, `-ci`, `-pom`, `-cli`, `-migration`, `-frontend`, `-qa`: skill pihak ketiga (TestDino), dipasang lewat `npx skills add testdino-hq/playwright-skill`. Referensi saja: kalau bentrok dengan file ini, file ini menang.

## Alur kerja
1. Isi `ROLES` + kredensial akun uji di `.env`, lalu `npm run setup` (login semua role, cek `.auth/`).
   Login kena reCAPTCHA: globalSetup (`LoginPage.loginDenganUlang`) klik OK lalu mengulang login sampai `LOGIN_MAX_ATTEMPTS` (default 5) dengan jeda bertahap. Ditolak karena alasan lain (mis. password salah) langsung berhenti.
   Sesi `.auth/<role>.json` yang lebih muda dari `AUTH_MAX_AGE_HOURS` (default 8) dipakai ulang tanpa login; paksa login ulang dengan `FORCE_LOGIN=true`.
   Tetap gagal 5x? Login manual: `npm run auth -- <role>`.
2. `npm run codegen -- nama-fitur --role <role>` -> rekam skenario ke `tests/recorded/`.
3. Rapikan jadi `pages/<Modul>/XxxPage.ts` + `data/staging/<Nama-Flow>.json` + `tests/<role>/<Modul>/NN-<Nama-Flow>.spec.ts`, lalu review dengan agent `qa-reviewer`.
4. `npm test` (atau `npx playwright test --project=<role>-chromium`), `npm run report` untuk melihat laporan.

## Agent di folder ini
- Bawaan Playwright: `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`.
  Healer boleh memperbaiki locator/timing, tetapi jangan melonggarkan assertion supaya hijau. Test yang di-skip healer harus dicek manual: bisa jadi itu bug asli.
- Custom: `test-designer` (desain test case), `qa-reviewer` (review read-only), `bug-triager` (analisis test gagal).

## Konteks yang belum terisi (tanya pemilik project, jangan diasumsikan)
- Login: form email + password dengan reCAPTCHA (staging `https://stag-polri.cd9dev.org`). Opsi paling stabil untuk otomasi: minta dev mematikan reCAPTCHA di staging atau memakai test key Google; belum dikonfirmasi.
- Hak akses tiap role (menu/aksi/data yang boleh dilihat masing-masing).
- Fitur dan alur utama yang menjadi prioritas, serta area yang baru berubah.
- Riwayat defect dan tenggat waktu.
