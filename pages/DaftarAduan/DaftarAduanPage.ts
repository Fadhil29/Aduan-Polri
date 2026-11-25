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

  // nama aksesibel diawali karakter ikon, jadi tidak pakai exact
  tombolCreate(): Locator {
    return this.tombol('Create', { exact: false });
  }

  tombolDownload(): Locator {
    return this.tombol('Download', { exact: false });
  }

  tombolHalamanBerikutnya(): Locator {
    return this.tombol('Next Page');
  }
}
