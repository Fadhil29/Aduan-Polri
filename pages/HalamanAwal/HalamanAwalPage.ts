import { BasePage } from '../BasePage';

// Aduan Polri tidak punya halaman dashboard: setelah login, aplikasi langsung mengarahkan
// ke halaman awal tiap role (contoh polres: /i/daftar-aduan/terkirim). Halaman ini dipakai
// sebagai acuan "sudah masuk ke tempat yang benar".
export class HalamanAwalPage extends BasePage {
  // buka root aplikasi dan biarkan aplikasi mengarahkan ke halaman awal role
  async bukaHalamanAwal(): Promise<void> {
    await this.buka('/');
    await this.page.waitForURL(/\/i\//, { timeout: 30_000 });
    await this.tungguData();
  }
}
