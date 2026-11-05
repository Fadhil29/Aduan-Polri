// pakai `test` dari file ini (bukan dari @playwright/test) di spec yang butuh login.
// memulihkan sessionStorage hasil globalSetup ke setiap halaman.
// role diambil dari metadata.role project, atau dari nama project: "polres-chromium" -> "polres".
import fs from 'node:fs';
import { test as base, expect, type BrowserContext } from '@playwright/test';
import { sessionFile } from './roles';

export { expect };

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

export const test = base.extend({
  context: async ({ context }, use, testInfo) => {
    const role = (testInfo.project.metadata?.role as string | undefined) ?? testInfo.project.name.split('-')[0];
    await restoreSession(context, role);
    await use(context);
  },
});
