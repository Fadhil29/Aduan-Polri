import { BasePage } from '../BasePage';

// halaman pertama setelah login
export class DashboardPage extends BasePage {
  async bukaDashboard(): Promise<void> {
    await this.buka('/');
    await this.tungguData();
  }
}
