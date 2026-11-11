---
name: aduan-polri-qa
description: Gunakan saat menulis, mereview, atau men-debug test Playwright project Aduan Polri (multi-role polres/polda/bareskrim, sesi login manual, data fiktif AUTO-, CI). Konvensi project ini menang kalau bentrok dengan skill generik.
---

# Aduan Polri QA

Aturan utama ada di `CLAUDE.md` (aturan keras + konvensi kode). Skill ini cuma alur kerja dan checklist. Kalau skill `playwright-*` (TestDino) menyarankan hal yang bentrok dengan `CLAUDE.md`, ikuti `CLAUDE.md`.

## Sebelum menulis
1. Tanya konteks yang belum jelas, jangan asumsi: role mana, fitur apa yang berubah, hak akses per role, tenggat. Prioritaskan area yang berubah atau berisiko tinggi (risk-based).
2. Pastikan `ENV=staging`. Data fiktif saja, awalan `AUTO-` lewat `autoId()`.

## Alur test baru
1. Rancang skenario: equivalence partitioning, boundary value, decision table, state transition. Sertakan negative case, edge case, dan pengecekan hak akses antar role.
2. Page object di `pages/<Modul>/XxxPage.ts` (tanpa `expect`), data di `data/staging/<Nama-Flow>.json`.
3. Spec di `tests/<role>/<Modul>/NN-<Nama-Flow>.spec.ts`, import `test`/`expect` dari `config/fixtures`, komentar `Test Step :` bernomor di awal body.
4. Tag di judul describe/test: `@smoke` (alur kritis, cepat) atau `@regression`. Boleh tambah tag modul.
5. `npm run typecheck`, lalu jalankan project role terkait saja: `npx playwright test --project=polres-chromium`.

## Checklist review
- Locator: role > label > text > testid, tanpa `nth()` dan XPath panjang?
- Ada `waitForTimeout`? Ganti dengan menunggu kondisi.
- Assertion mengecek hasil (isi, status, pesan), bukan sekadar elemen tampil?
- Ada skenario terlewat: batas nilai, input kosong/invalid, role yang tidak berhak, data besar, error server?
- Data pribadi asli bocor di spec, data JSON, screenshot, trace, atau laporan?
- Test bergantung pada urutan/data test lain tanpa disengaja? (project ini sengaja berurutan, `workers: 1`, jadi dependensi harus eksplisit lewat nomor `NN-`.)

## Debug test gagal
1. Redirect ke `/login`: sesi kedaluwarsa. Jalankan `npm run setup`, atau `npm run codegen:auth -- <role>` kalau login pakai captcha/OTP.
2. Buka trace dari laporan (`npm run report`). Trace dan screenshot bisa memuat data, jangan dibagikan ke luar tim.
3. Tentukan akar masalah: bug aplikasi, test rapuh, data, atau environment. Jangan melonggarkan assertion supaya hijau.

## Larangan
- Mengarang angka (coverage, jumlah defect, persen otomasi). Tulis "belum terukur".
- Mengklaim test lulus kalau belum benar-benar dijalankan. Katakan terus terang kalau tidak bisa dieksekusi.
- Menulis kredensial atau token di kode, log, atau output. Jangan commit `.env` dan `.auth/`.
- Menjalankan atau merekam di environment selain staging.
