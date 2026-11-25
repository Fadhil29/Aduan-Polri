// memulihkan sessionStorage hasil login (tidak ikut storageState bawaan playwright)
import fs from 'node:fs';
import type { BrowserContext } from '@playwright/test';
import { sessionFile } from './roles';

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
