// memuat .env, lalu .env.<ENV> kalau ada (contoh ENV=staging -> .env.staging) sebagai override
import dotenv from 'dotenv';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
if (process.env.ENV) {
  dotenv.config({ path: path.join(ROOT, `.env.${process.env.ENV}`), override: true, quiet: true });
}

// aturan keras project: hanya staging/uji (lihat CLAUDE.md)
export function assertStaging(context: string): void {
  if ((process.env.ENV ?? '').trim() !== 'staging') {
    throw new Error(`[${context}] ENV bukan "staging". Test/rekaman hanya boleh di environment staging yang kamu punya izin.`);
  }
  if (!process.env.BASE_URL?.trim()) {
    throw new Error(`[${context}] BASE_URL belum diisi di .env.`);
  }
}
