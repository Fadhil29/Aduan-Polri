import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// ============================================================
// ENV yang dipakai:
//   BASE_URL            default staging, JANGAN diarahkan ke prod dari sini
//   ACCOUNTS_FILE        path ke JSON [{ "email": "...", "password": "..." }, ...]
//                         (default: load-test/accounts.json, lihat accounts.example.json)
//   LOAD_CAPTCHA_TOKEN    token bypass captcha dari developer (shared, bukan per-akun)
//   TARGET_VUS            VU puncak saat steady-state (default 10)
//   RAMP_UP               durasi naik ke TARGET_VUS (default 30s)
//   HOLD                  durasi bertahan di TARGET_VUS (default 1m)
//   RAMP_DOWN             durasi turun ke 0 (default 15s)
// ============================================================

const BASE_URL = (__ENV.BASE_URL || 'stag-polri.cd9dev.org/login').replace(/\/$/, '');
const ACCOUNTS_FILE = __ENV.ACCOUNTS_FILE || './accounts.json';
const CAPTCHA_TOKEN = __ENV.LOAD_CAPTCHA_TOKEN || '';

const TARGET_VUS = Number(__ENV.TARGET_VUS || 10);
const RAMP_UP = __ENV.RAMP_UP || '30s';
const HOLD = __ENV.HOLD || '1m';
const RAMP_DOWN = __ENV.RAMP_DOWN || '15s';

// SharedArray cuma di-load sekali lalu dibagi ke semua VU (hemat memori),
// jadi file akun WAJIB ada sebelum k6 run dieksekusi.
const accounts = new SharedArray('accounts', function () {
  let raw;
  try {
    raw = JSON.parse(open(ACCOUNTS_FILE));
  } catch (e) {
    throw new Error(
      `Gagal baca ${ACCOUNTS_FILE}. Siapin file JSON array [{email,password}] dulu ` +
      `(lihat load-test/accounts.example.json), lalu jalankan dengan -e ACCOUNTS_FILE=path/ke/file.json`,
    );
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`${ACCOUNTS_FILE} harus berupa JSON array berisi minimal 1 akun {email,password}`);
  }
  return raw;
});

export const options = {
  stages: [
    { duration: RAMP_UP, target: TARGET_VUS },
    { duration: HOLD, target: TARGET_VUS },
    { duration: RAMP_DOWN, target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

// setup() jalan sekali di awal, sebelum VU mana pun mulai -> tempat yang pas
// buat validasi, supaya ketauan konfigurasi salah SEBELUM nembak beneran.
export function setup() {
  if (accounts.length < TARGET_VUS) {
    throw new Error(
      `Akun kurang: ada ${accounts.length} akun tapi TARGET_VUS=${TARGET_VUS}. ` +
      `Kalau VU > jumlah akun, beberapa VU bakal pakai akun yang sama secara bersamaan ` +
      `dan bisa saling invalidate sesi (lihat catatan "1 device per akun" di komentar lama). ` +
      `Tambah akun di ${ACCOUNTS_FILE} atau kecilin TARGET_VUS.`,
    );
  }
  if (!CAPTCHA_TOKEN) {
    console.warn('[setup] LOAD_CAPTCHA_TOKEN kosong -- request login kemungkinan bakal ditolak captcha.');
  }
  console.log(`[setup] ${accounts.length} akun siap dipakai, target ${TARGET_VUS} VU.`);
  return { accountCount: accounts.length };
}

export default function () {
  // Mapping akun -> VU dibikin deterministik (bukan random) supaya 1 VU selalu
  // pakai akun yang sama sepanjang test run ini, dan antar-VU nggak tabrakan
  // SELAMA jumlah akun >= TARGET_VUS (sudah dicek di setup()).
  const account = accounts[(__VU - 1) % accounts.length];

  // Device id ikut nomor iterasi juga, biar tiap login dianggap "device" baru
  // oleh server -- hindari kasus sesi iterasi sebelumnya dari VU yang sama
  // masih dianggap aktif dan bikin login kedua ditolak/invalidate yang lain.
  const deviceId = `k6-vu${__VU}-iter${__ITER}`;

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: account.email,
      password: account.password,
      token: CAPTCHA_TOKEN,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Device-Id': deviceId,
        'X-Device-Name': deviceId,
      },
      tags: { name: 'POST /api/auth/login' },
    },
  );

  if (res.status !== 200) {
    console.warn(
      `VU ${__VU} iter ${__ITER} email=${account.email} status=${res.status} ` +
      `server=${res.headers['Server']} body=${String(res.body).slice(0, 300)}`,
    );
  }

  check(res, {
    'status 200': (r) => r.status === 200,
    'ada token/otp di response': (r) => {
      try {
        const d = r.json('data');
        return !!(d && (d.token || d.requires_otp));
      } catch (e) {
        return false;
      }
    },
  });

  // jitter: tiap VU sleep 1-2 detik (bukan persis 1 detik), biar traffic
  // nggak sinkron nembak bareng di tiap iterasi (hindari pola spike buatan)
  sleep(1 + Math.random());
}