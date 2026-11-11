import type { Locator, Page } from '@playwright/test';

export class DaftarAduanPage {
  constructor(private readonly page: Page) {}

  async gotoTerkirim(): Promise<void> {
    await this.page.goto('/i/daftar-aduan/terkirim');
    await this.page.waitForLoadState('networkidle');
  }

  terkirimLink(): Locator {
    return this.page.getByRole('link', { name: 'Terkirim', exact: true });
  }

  // nama aksesibel diawali karakter ikon, jadi tidak pakai exact
  createButton(): Locator {
    return this.page.getByRole('button', { name: 'Create' });
  }

  downloadButton(): Locator {
    return this.page.getByRole('button', { name: 'Download' });
  }

  nextPageButton(): Locator {
    return this.page.getByRole('button', { name: 'Next Page', exact: true });
  }

  // form login hanya muncul kalau sesi tidak valid
  loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login', exact: true });
  }
}
