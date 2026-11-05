import type { Locator, Page } from '@playwright/test';

// selector dari halaman /login staging (form email + password tanpa label; nama aksesibel dari placeholder)
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Enter your email' }).fill(username);
    await this.page.getByRole('textbox', { name: 'Enter your password' }).fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  // tombol login, dipakai spec login untuk memastikan masih/sudah di halaman login
  loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login' });
  }

  // tunggu sampai keluar dari /login (redirect setelah login berhasil)
  async waitForLoggedIn(timeout = 30_000): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout });
  }
}
