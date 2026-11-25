import type { Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

// halaman detail aduan (dibuka dari ikon mata di tabel)
export class DetailAduanPage extends BasePage {
  // nama aksesibel tombol diawali karakter ikon, jadi tidak pakai exact
  tombolApprove(): Locator {
    return this.tombol('Approve', { exact: false });
  }

  tombolYaSetujui(): Locator {
    return this.tombol('Ya, Setujui');
  }

  // popup hasil setelah konfirmasi, ditutup dengan OK
  tombolOk(): Locator {
    return this.tombol('OK');
  }

  async klikApprove(): Promise<void> {
    await this.tombolApprove().click();
  }

  async konfirmasiSetujui(): Promise<void> {
    await this.tombolYaSetujui().click();
  }

  async tutupPopup(): Promise<void> {
    await this.tombolOk().click();
    await this.tombolOk().waitFor({ state: 'hidden' });
  }

  // approve lengkap: Approve -> Ya, Setujui -> OK. dipakai juga sebagai prasyarat test lain
  async approve(): Promise<void> {
    await this.klikApprove();
    await this.konfirmasiSetujui();
    await this.tutupPopup();
  }
}
