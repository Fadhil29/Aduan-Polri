import http from 'k6/http';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { Trend, Counter, Rate } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || '').trim().replace(/\/+$/, '');
const CAPTCHA_TOKEN = (__ENV.LOAD_CAPTCHA_TOKEN || 'bypass').trim();
const ACCOUNTS_FILE = __ENV.ACCOUNTS_FILE || './accounts.json';
const ALLOW_PRODUCTION = __ENV.ALLOW_PRODUCTION === 'true';
// rps ceiling wajib diisi, angka dari ops
const MAX_RPS = Number(__ENV.MAX_RPS || 0);
// format "rps:durasi,...", contoh "1:2m,2:2m,5:3m,10:3m,20:3m,5:3m,1:2m"
const STAGES = (__ENV.STAGES || '1:2m,2:2m,5:3m,10:3m,5:3m,1:2m')
    .split(',')
    .map((s) => {
        const [target, duration] = s.trim().split(':');
        return { target: Number(target), duration };
    });

const accounts = new SharedArray('accounts', () => {
    const data = JSON.parse(open(ACCOUNTS_FILE));
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`${ACCOUNTS_FILE} kosong atau bukan array.`);
    }
    return data;
});

const loginDuration = new Trend('login_duration', true);
const loginSuccess = new Rate('login_success_rate');
const serverErrors = new Counter('server_errors'); // 5xx, 429, network

export const options = {
    scenarios: {
        login_stress: {
            executor: 'ramping-arrival-rate',
            startRate: 1,
            timeUnit: '1s',
            preAllocatedVUs: Number(__ENV.PRE_VUS || 20),
            maxVUs: Number(__ENV.MAX_VUS || 100),
            stages: STAGES,
        },
    },
    thresholds: {
        // stop otomatis begitu sistem mulai rusak
        server_errors: [{ threshold: 'count<20', abortOnFail: true }],
        http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
        login_duration: [
            { threshold: 'p(95)<3000', abortOnFail: false },
            { threshold: 'p(99)<4000', abortOnFail: false },
            { threshold: 'p(95)<8000', abortOnFail: true, delayAbortEval: '30s' },
        ],
        login_success_rate: ['rate>0.99'],
    },
    summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
    if (!/^https?:\/\/[^/\s]+/i.test(BASE_URL)) {
        throw new Error('BASE_URL wajib diisi (pakai staging kalau bisa).');
    }
    const host = BASE_URL.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    if (host === 'polri.aduankonten.id' && !ALLOW_PRODUCTION) {
        throw new Error('Production diblokir. Set ALLOW_PRODUCTION=true setelah ada approval.');
    }
    if (!(MAX_RPS > 0)) {
        throw new Error('MAX_RPS wajib diisi sesuai ceiling yang disetujui ops.');
    }
    const peak = Math.max(...STAGES.map((s) => s.target));
    if (peak > MAX_RPS) {
        throw new Error(`Puncak STAGES (${peak} rps) melebihi MAX_RPS (${MAX_RPS}).`);
    }
    console.log(`STRESS LOGIN | ${BASE_URL} | ${accounts.length} akun | puncak ${peak} rps`);
    console.log(`STAGES: ${JSON.stringify(STAGES)}`);
}

export default function () {
    // round-robin akun, satu akun bisa dipakai berulang di beban tinggi
    const account = accounts[exec.scenario.iterationInTest % accounts.length];

    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            email: account.email,
            password: account.password,
            token: CAPTCHA_TOKEN,
        }),
        {
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            timeout: '30s',
            tags: { endpoint: 'login' },
        }
    );

    loginDuration.add(res.timings.duration);

    let ok = false;
    try {
        const body = res.json();
        ok = res.status >= 200 && res.status < 300 && body.success === true && !!(body.data && body.data.token);
    } catch (e) {
        ok = false;
    }
    loginSuccess.add(ok);

    if (res.status === 0 || res.status === 429 || res.status >= 500) {
        serverErrors.add(1);
        // tanpa password/token/body
        console.warn(`STRESS_ERROR ${new Date().toISOString()} status=${res.status} email=${account.email}`);
    }
}