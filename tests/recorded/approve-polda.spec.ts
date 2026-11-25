import { test, expect } from '@playwright/test';

test.use({
  locale: 'id-ID',
  storageState: 'C:\\\\Users\\\\ADMIN\\\\Downloads\\\\Aduan-Polri-Playwright\\\\.auth\\\\polda.json',
  timezoneId: 'Asia/Jakarta'
});

test('test', async ({ page }) => {
  await page.goto('https://stag-polri.cd9dev.org/');
  await page.goto('https://stag-polri.cd9dev.org/i/home');
  await page.getByRole('button', { name: 'Daftar Aduan ' }).click();
  await page.locator('.ng-tns-c464269736-1.ng-trigger > div:nth-child(3)').first().click();
  await page.getByRole('button').filter({ hasText: /^$/ }).nth(4).click();
  await page.getByRole('button', { name: ' Approve' }).click();
  await page.getByRole('button', { name: 'Ya, Setujui' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
});