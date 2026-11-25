// ambil data tes sesuai ENV: getData('Buat-Aduan') -> data/<ENV>/Buat-Aduan.json
import fs from 'node:fs';
import path from 'node:path';
import './env';

export function getData<T = Record<string, unknown>>(name: string): T {
  const env = process.env.ENV || 'staging';
  const file = path.resolve(__dirname, '..', 'data', env, `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`File data tidak ada: data/${env}/${name}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

// penanda unik untuk data yang dibuat test, contoh: AUTO-20261103-142530-ab12
export function autoId(prefix = 'AUTO'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

// path file upload dari .env (path lokal tiap mesin, tidak di-commit), contoh UPLOAD_SURAT_PDF
export function fileUpload(envKey: string): string {
  const file = process.env[envKey]?.trim().replace(/^"(.*)"$/, '$1');
  if (!file) throw new Error(`Isi ${envKey} di .env dengan path file lokal`);
  if (!fs.existsSync(file)) throw new Error(`File ${envKey} tidak ditemukan: ${file}`);
  return file;
}
