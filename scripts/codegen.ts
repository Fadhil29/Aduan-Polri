/**
 * Pembungkus `playwright codegen` supaya rekaman selalu:
 *  - mulai dari BASE_URL di .env (tidak hardcode URL di kode),
 *  - tersimpan rapi di tests/recorded/<nama>.spec.ts,
 *  - memakai sesi login role yang sudah tersimpan di .auth/<role>.json (kalau ada),
 *  - hanya jalan kalau ENV=staging.
 *
 * Pemakaian:
 *   npm run codegen:auth -- admin             -> login manual, sesi disimpan ke .auth/admin.json
 *   npm run codegen -- nama-fitur             -> rekam, hasil ke tests/recorded/nama-fitur.spec.ts
 *   npm run codegen -- nama-fitur --role admin      -> rekam memakai sesi .auth/admin.json
 *   npm run codegen -- nama-fitur --path /halaman   -> mulai dari BASE_URL + /halaman
 *   npm run codegen -- nama-fitur --no-auth   -> rekam tanpa memuat sesi login
 *   (tanpa --role: dipakai role pertama di ROLES)
 *
 * Rekaman adalah DRAFT. Setelah dirapikan, pindahkan ke:
 *   pages/<Modul>/XxxPage.ts, data/staging/<Nama-Flow>.json, tests/<role>/<Modul>/NN-<Nama-Flow>.spec.ts
 *   npm run codegen -- nama-fitur --force     -> timpa file rekaman yang sudah ada
 */
import '../config/env';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROLES, authFile } from '../config/roles';

const RECORD_DIR = path.join('tests', 'recorded');

function fail(message: string): never {
  console.error(`\n[codegen] ${message}\n`);
  process.exit(1);
}

const [mode, ...rest] = process.argv.slice(2);
if (mode !== 'record' && mode !== 'auth') {
  fail('Mode tidak dikenal. Pakai: npm run codegen -- <nama>  atau  npm run codegen:auth -- <role>');
}

const flagValue = (flag: string) => {
  const i = rest.indexOf(flag);
  return i >= 0 ? rest[i + 1] ?? '' : '';
};
const valueFlags = new Set(['--path', '--role']);
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const positional = rest.filter((a, i) => !a.startsWith('--') && !valueFlags.has(rest[i - 1]));
const startPath = flagValue('--path');

const baseUrl = process.env.BASE_URL?.trim();
if (!baseUrl) {
  fail('BASE_URL belum diisi. Salin .env.example ke .env lalu isi BASE_URL (URL staging).');
}

let target: string;
try {
  target = new URL(startPath || '/', baseUrl).toString();
} catch {
  fail(`BASE_URL tidak valid: "${baseUrl}"`);
}

if ((process.env.ENV ?? '').trim() !== 'staging') {
  fail('ENV bukan "staging". Rekaman hanya boleh dilakukan di environment staging/uji yang kamu punya izin.');
}

const q = (value: string) => JSON.stringify(value);
const common = ['--target=playwright-test', '--browser=chromium', '--lang=id-ID', '--timezone=Asia/Jakarta'];

let args: string[];

function pickRole(candidate: string | undefined): string {
  const role = (candidate || ROLES[0] || '').trim().toLowerCase();
  if (!role) fail('Role belum ditentukan. Isi ROLES di .env atau sebut role-nya, contoh: npm run codegen:auth -- admin');
  if (!/^[a-z0-9_]+$/.test(role)) fail(`Nama role "${role}" tidak valid (huruf kecil, angka, _ ; tanpa "-").`);
  if (ROLES.length && !ROLES.includes(role)) fail(`Role "${role}" tidak ada di ROLES (${ROLES.join(', ')}).`);
  return role;
}

if (mode === 'auth') {
  const role = pickRole(positional[0] || flagValue('--role'));
  const file = authFile(role);
  mkdirSync(path.dirname(file), { recursive: true });
  args = [...common, `--save-storage=${q(file)}`, q(target)];
  console.log(`[codegen] Login manual sebagai "${role}" di browser yang terbuka, lalu TUTUP browser. Sesi disimpan ke .auth/${role}.json`);
} else {
  const name = positional[0];
  if (!name || !/^[a-z0-9][a-z0-9_-]*$/i.test(name)) {
    fail('Beri nama rekaman (huruf, angka, - atau _). Contoh: npm run codegen -- buat-aduan');
  }
  mkdirSync(RECORD_DIR, { recursive: true });
  const output = path.join(RECORD_DIR, `${name}.spec.ts`);
  if (existsSync(output) && !flags.has('--force')) {
    fail(`${output} sudah ada. Pakai nama lain atau tambahkan --force untuk menimpa.`);
  }
  args = [...common, `--output=${q(output)}`];
  const role = flags.has('--no-auth') || (!ROLES.length && !flagValue('--role')) ? '' : pickRole(flagValue('--role'));
  if (role && existsSync(authFile(role))) {
    args.push(`--load-storage=${q(authFile(role))}`);
    console.log(`[codegen] Memuat sesi login role "${role}" dari .auth/${role}.json`);
  } else {
    if (role) console.log(`[codegen] .auth/${role}.json belum ada (jalankan npm run setup atau npm run codegen:auth -- ${role}).`);
    console.log('[codegen] Merekam tanpa sesi login.');
  }
  args.push(q(target));
  console.log(`[codegen] Hasil rekaman: ${output}`);
}

console.log(`[codegen] Target: ${target}`);

const child = spawn(`npx playwright codegen ${args.join(' ')}`, { stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
