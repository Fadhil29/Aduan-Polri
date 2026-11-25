// memulihkan sessionStorage hasil login (tidak ikut storageState bawaan playwright)
import fs from 'node:fs';
import type { Browser, BrowserContext } from '@playwright/test';
import { authFile, sessionFile } from './roles';

type SessionDump = { host: string; items: Record<string, string> };

export async function restoreSession(context: BrowserContext, role: string): Promise<void> {
  const file = sessionFile(role);
  if (!fs.existsSync(file)) return;
  const session = JSON.parse(fs.readFileSync(file, 'utf8')) as SessionDump;
  await context.addInitScript((s: SessionDump) => {
    if (location.hostname !== s.host) return;
    for (const [k, v] of Object.entries(s.items)) {
      if (sessionStorage.getItem(k) === null) sessionStorage.setItem(k, v);
    }
  }, session);
}

// buka browser context baru sebagai role lain (pakai sesi .auth/<role>.json), untuk alur multi-role
// dalam satu test, contoh: polres membuat aduan lalu polda meng-approve
export async function contextRole(browser: Browser, role: string): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL,
    storageState: authFile(role),
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  });
  await restoreSession(context, role);
  return context;
}
