// daftar role dibaca dari ROLES di .env (huruf kecil, dipisah koma, tanpa tanda "-")
import path from 'node:path';
import './env';

export const ROLES: string[] = (process.env.ROLES ?? '')
  .split(',')
  .map((r) => r.trim().toLowerCase())
  .filter(Boolean);

const AUTH_DIR = path.resolve(__dirname, '..', '.auth');

// cookie + localStorage per role
export const authFile = (role: string) => path.join(AUTH_DIR, `${role}.json`);
// sessionStorage per role (tidak ikut storageState bawaan playwright)
export const sessionFile = (role: string) => path.join(AUTH_DIR, `${role}.session.json`);

export function credentials(role: string): { username?: string; password?: string } {
  const key = role.toUpperCase();
  return { username: process.env[`${key}_USERNAME`], password: process.env[`${key}_PASSWORD`] };
}
