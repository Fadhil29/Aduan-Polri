Rapikan rekaman Playwright berikut sesuai aturan di CLAUDE.md.
Hasilkan: page object di `pages/<Modul>/`, data uji di `data/staging/` (kalau perlu), dan spec di `tests/<role>/<Modul>/NN-<Nama-Flow>.spec.ts`.
Page object `extends BasePage` dan pakai helper yang sudah ada (judul, tombol, tabel, isiTeks), method berbahasa Indonesia (`bukaXxx`, `isiXxx`, `klikXxx`). Spec login lewat `new LoginPage(page).pastikanMasuk('<role>')` di beforeEach. Pakai ulang page object yang sudah ada di `pages/`, jangan buat duplikat. Tulis daftar asumsi singkat di akhir.

Role: [ISI: contoh polres]
Modul: [ISI: contoh Aduan]
Nama flow: [ISI: contoh buat aduan]
File rekaman: [ISI: contoh tests/recorded/buat-aduan.spec.ts]
codegen :

