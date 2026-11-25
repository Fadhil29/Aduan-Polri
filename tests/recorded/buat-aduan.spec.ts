import { test, expect } from '@playwright/test';

test.use({
  locale: 'id-ID',
  storageState: 'C:\\\\Users\\\\ADMIN\\\\Downloads\\\\Aduan-Polri-Playwright\\\\.auth\\\\polres.json',
  timezoneId: 'Asia/Jakarta'
});

test('test', async ({ page }) => {
  await page.goto('https://stag-polri.cd9dev.org/');
  await page.goto('https://stag-polri.cd9dev.org/i/home');
  await page.getByRole('button', { name: 'Daftar Aduan ' }).click();
  await page.locator('.submenus').first().click();
  await page.getByRole('button', { name: ' Create' }).click();
  await page.getByRole('textbox', { name: 'Masukkan judul aduan' }).click();
  await page.getByRole('textbox', { name: 'Masukkan judul aduan' }).fill('testing aduan 01');
  await page.getByRole('textbox', { name: 'Masukkan nomor surat' }).click();
  await page.getByRole('textbox', { name: 'Masukkan nomor surat' }).fill('test.01');
  await page.getByRole('button').filter({ hasText: 'Upload file surat' }).click();
  await page.getByLabel('Browse Files').setInputFiles('Lorem ipsum sir dolor amet.pdf');
  await page.getByRole('combobox', { name: 'Pilih kategori aduan...' }).click();
  await page.getByRole('option', { name: 'Fitnah' }).click();
  await page.getByRole('button', { name: ' Add URL' }).click();
  await page.getByRole('combobox', { name: 'Pilih jenis platform...' }).click();
  await page.getByRole('option', { name: 'Domain' }).click();
  await page.getByRole('textbox', { name: 'www.link.com' }).click();
  await page.getByRole('textbox', { name: 'www.link.com' }).fill('https://stag-polri.cd9dev.org/i/daftar-aduan/draft/add');
  await page.getByText('Drag & drop atau Browse Files').click();
  await page.locator('label').filter({ hasText: 'Drag & drop atau Browse Files' }).click();
  await page.getByLabel('Drag & drop atau Browse Files').setInputFiles('background kawung for ppt.png');
  await page.getByRole('textbox', { name: 'Terjadi penipuan' }).click();
  await page.getByRole('textbox', { name: 'Terjadi penipuan' }).fill('lorem ipsum sir dolor amet');
  await page.getByRole('combobox', { name: 'Pilih dasar hukum...' }).click();
  await page.getByText('KUHP Baru UU No. 1 Tahun 2023 Pasal 433 Pasal 433 - (1) Setiap orang yang').click();
  await page.getByRole('dialog').getByRole('button', { name: ' Add URL' }).click();
  await page.getByRole('button', { name: ' Submit' }).click();
  await page.getByRole('button', { name: 'Ya, Kirim' }).click();
  await page.getByText('Daftar AduanDraftDaftar Aduan').click();
});