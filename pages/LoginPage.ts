import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

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

  // tunggu sampai keluar dari /login (redirect setelah login berhasil)
  async tungguMasuk(timeout = 30_000): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout });
  }

  // pakai sesi dari globalSetup (.auth). kalau dilempar ke /login berarti sesi habis.
  // login ulang lewat UI hanya kalau kredensial role ada di .env (login ber-captcha tetap harus manual).
  async pastikanMasuk(role: string): Promise<void> {
    await this.buka('/');
    await this.page.waitForLoadState('networkidle');
    if (!new URL(this.page.url()).pathname.startsWith('/login')) return;

    const key = role.toUpperCase();
    const email = process.env[`${key}_USERNAME`];
    const password = process.env[`${key}_PASSWORD`];
    if (!email || !password) {
      throw new Error(`Sesi ${role} kedaluwarsa. Jalankan: npm run codegen:auth -- ${role}`);
    }
    await this.login(email, password);
    await this.tungguMasuk();
  }
}
