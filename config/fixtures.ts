// pakai `test` dari file ini (bukan dari @playwright/test) di spec yang butuh login.
// memulihkan sessionStorage hasil globalSetup ke setiap halaman.
// role diambil dari metadata.role project, atau dari nama project: "polres-chromium" -> "polres".
import { test as base, expect } from '@playwright/test';
import { restoreSession } from './session';

export { expect, restoreSession };

export const test = base.extend({
  context: async ({ context }, use, testInfo) => {
    const role = (testInfo.project.metadata?.role as string | undefined) ?? testInfo.project.name.split('-')[0];
    await restoreSession(context, role);
    await use(context);
  },
});
