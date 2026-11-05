import http from 'k6/http';
import { check, sleep } from 'k6';

// env: BASE_URL, LOAD_EMAIL, LOAD_PASSWORD, LOAD_CAPTCHA_TOKEN (token uji dari developer), VUS, DURATION
const BASE_URL = (__ENV.BASE_URL || 'https://stag-polri.cd9dev.org').replace(/\/$/, '');

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  // satu device id per VU, karena staging membatasi 1 device per akun
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: __ENV.LOAD_EMAIL,
      password: __ENV.LOAD_PASSWORD,
      token: __ENV.LOAD_CAPTCHA_TOKEN,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Device-Id': `k6-vu-${__VU}`,
        'X-Device-Name': `k6-vu-${__VU}`,
      },
      tags: { name: 'POST /api/auth/login' },
    },
  );

  if (res.status !== 200) {
    console.warn(`VU ${__VU} status=${res.status} server=${res.headers['Server']} body=${String(res.body).slice(0, 300)}`);
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

  sleep(1);
}
