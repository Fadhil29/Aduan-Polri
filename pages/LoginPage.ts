import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

// semua halaman yang butuh login ada di bawah /i/ (contoh: /i/daftar-aduan/terkirim)
export const HALAMAN_DALAM = /\/i\//;

// selector dari halaman /login staging (form email + password tanpa label; nama aksesibel dari placeholder)
export class LoginPage extends BasePage {
  async bukaLogin(): Promise<void> {
    await this.buka('/login');
  }

  kolomEmail(): Locator {
    return this.page.getByRole('textbox', { name: 'Enter your email' });
  }

  kolomPassword(): Locator {
    return this.page.getByRole('textbox', { name: 'Enter your password' });
  }

  tombolLogin(): Locator {
    return this.tombol('Login');
  }

  async isiEmail(email: string): Promise<void> {
    await this.kolomEmail().fill(email);
  }

  async isiPassword(password: string): Promise<void> {
    await this.kolomPassword().fill(password);
  }

  async klikLogin(): Promise<void> {
    await this.tombolLogin().click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.isiEmail(email);
    await this.isiPassword(password);
    await this.klikLogin();
  }

  // popup "Maaf ... reCAPTCHA gagal diverifikasi" setelah klik Login
  pesanCaptchaGagal(): Locator {
    return this.page.getByText(/reCAPTCHA gagal diverifikasi/i);
  }

  // popup error lain (judul "Maaf"), misalnya email/password salah
  pesanGagal(): Locator {
    return this.page.getByText('Maaf', { exact: true });
  }

  tombolOk(): Locator {
    return this.tombol('OK');
  }

  // login dengan percobaan ulang kalau reCAPTCHA menolak.
  // berhenti langsung kalau ditolak karena alasan lain (jangan sampai akun terkunci).
  async loginDenganUlang(email: string, password: string, maksPercobaan = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5)): Promise<void> {
    for (let percobaan = 1; percobaan <= maksPercobaan; percobaan++) {
      await this.bukaLogin();
      await this.login(email, password);

      const masuk = this.page.waitForURL(HALAMAN_DALAM, { timeout: 30_000 }).then(() => 'masuk' as const);
      const captcha = this.pesanCaptchaGagal().waitFor({ timeout: 30_000 }).then(() => 'captcha' as const);
      const gagal = this.pesanGagal().waitFor({ timeout: 30_000 }).then(() => 'gagal' as const);
      const hasil = await Promise.any([masuk, captcha, gagal]).catch(() => 'timeout' as const);

      if (hasil === 'masuk') {
        if (percobaan > 1) console.log(`[login] berhasil di percobaan ke-${percobaan}`);
        return;
      }
      if (hasil === 'gagal' && !(await this.pesanCaptchaGagal().isVisible())) {
        const isi = (await this.page.getByRole('dialog').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        throw new Error(`login ditolak bukan karena reCAPTCHA${isi ? `: "${isi}"` : ''}. cek kredensial di .env`);
      }

      const alasan = hasil === 'timeout' ? 'belum masuk ke /i/ setelah 30 detik' : 'reCAPTCHA gagal diverifikasi';
      console.warn(`[login] percobaan ${percobaan}/${maksPercobaan}: ${alasan}`);
      if (percobaan === maksPercobaan) {
        throw new Error(`login gagal ${maksPercobaan}x (${alasan}). login manual: npm run auth -- <role>`);
      }
      await this.tombolOk().click({ timeout: 2_000 }).catch(() => {});
      // jeda bertahap sebelum mencoba lagi (5s, 10s, 15s, ...)
      await new Promise((r) => setTimeout(r, 5_000 * percobaan));
    }
  }

  // tanda login berhasil = diarahkan ke halaman di bawah /i/
  async tungguMasuk(timeout = 30_000): Promise<void> {
    await this.page.waitForURL(HALAMAN_DALAM, { timeout });
  }

  // buka aplikasi: sesi berlaku kalau diarahkan ke /i/, tidak berlaku kalau form login muncul
  async sudahMasuk(alamat = '/'): Promise<boolean> {
    await this.buka(alamat);
    const hasil = await Promise.any([
      this.page.waitForURL(HALAMAN_DALAM, { timeout: 30_000 }).then(() => true),
      this.tombolLogin().waitFor({ state: 'visible', timeout: 30_000 }).then(() => false),
    ]).catch(() => false);
    return hasil && HALAMAN_DALAM.test(this.page.url());
  }

  // pakai sesi dari globalSetup (.auth). kalau form login muncul berarti sesi habis.
  // login ulang lewat UI hanya kalau kredensial role ada di .env.
  async pastikanMasuk(role: string): Promise<void> {
    if (await this.sudahMasuk()) return;

    const key = role.toUpperCase();
    const email = process.env[`${key}_USERNAME`];
    const password = process.env[`${key}_PASSWORD`];
    if (!email || !password) {
      throw new Error(`Sesi ${role} kedaluwarsa. Jalankan: npm run auth -- ${role}`);
    }
    await this.loginDenganUlang(email, password);
  }
}
