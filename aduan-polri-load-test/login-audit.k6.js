
import http from 'k6/http';
import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { Trend, Counter } from 'k6/metrics';

// ==========================================
// CONFIGURATION
// ==========================================

const BASE_URL = (
    __ENV.BASE_URL || 'https://polri.aduankonten.id'
).trim().replace(/\/+$/, '');

const CAPTCHA_TOKEN = (__ENV.LOAD_CAPTCHA_TOKEN || 'bypass').trim();

const ACCOUNTS_FILE = __ENV.ACCOUNTS_FILE || './accounts.json';

const REQUEST_INTERVAL = Number(__ENV.REQUEST_INTERVAL_SECONDS || 2);

const MAX_ACCOUNTS = Number(__ENV.MAX_ACCOUNTS || 0);

const ALLOW_PRODUCTION = __ENV.ALLOW_PRODUCTION === 'true';

const STOP_ON_ERROR = __ENV.STOP_ON_ERROR !== 'false';

// ==========================================
// CUSTOM METRICS
// ==========================================

const loginDuration = new Trend('login_duration');
const loginSuccess = new Counter('login_success');
const loginFailed = new Counter('login_failed');
const loginOtpRequired = new Counter('login_otp_required');
const loginNetworkError = new Counter('login_network_error');

// ==========================================
// LOAD ACCOUNT DATA
// ==========================================

const accounts = new SharedArray('accounts', function () {
    let data;

    try {
        data = JSON.parse(open(ACCOUNTS_FILE));
    } catch (error) {
        throw new Error(
            `Cannot load ${ACCOUNTS_FILE}. Check file path and JSON format.`
        );
    }

    if (!Array.isArray(data)) {
        throw new Error('accounts.json must contain a JSON array.');
    }

    if (data.length === 0) {
        throw new Error('accounts.json contains no accounts.');
    }

    const validAccounts = data.filter((account, index) => {
        if (
            !account ||
            typeof account.email !== 'string' ||
            typeof account.password !== 'string' ||
            !account.email.trim() ||
            !account.password
        ) {
            throw new Error(
                `Invalid account data at index ${index}. Required: email and password.`
            );
        }

        return true;
    });

    if (MAX_ACCOUNTS > 0) {
        return validAccounts.slice(0, MAX_ACCOUNTS);
    }

    return validAccounts;
});

// ==========================================
// K6 OPTIONS
// ==========================================

export const options = {
    scenarios: {
        account_audit: {
            executor: 'shared-iterations',
            vus: 1,
            iterations: accounts.length,
            maxDuration: __ENV.MAX_DURATION || '45m',
            gracefulStop: '0s',
        },
    },
};

// ==========================================
// CONFIGURATION VALIDATION
// ==========================================

export function setup() {
    console.log('====================================');
    console.log('LOGIN ACCOUNT AUDIT');
    console.log('====================================');

    console.log(`BASE_URL: ${BASE_URL}`);
    console.log(`ACCOUNTS: ${accounts.length}`);
    console.log(`REQUEST INTERVAL: ${REQUEST_INTERVAL}s`);

    // Validate URL without relying on the URL constructor.
    const urlPattern = /^https?:\/\/[^/\s?#]+(?:\/[^?#]*)?$/i;

    if (!urlPattern.test(BASE_URL)) {
        throw new Error(
            'BASE_URL must be a valid absolute HTTP/HTTPS URL.'
        );
    }

    const host = BASE_URL
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .toLowerCase();

    if (
        host === 'polri.aduankonten.id' &&
        !ALLOW_PRODUCTION
    ) {
        throw new Error(
            'Production execution blocked. Set ALLOW_PRODUCTION=true.'
        );
    }

    if (!CAPTCHA_TOKEN) {
        throw new Error('LOAD_CAPTCHA_TOKEN is empty.');
    }

    if (
        !Number.isFinite(REQUEST_INTERVAL) ||
        REQUEST_INTERVAL < 1
    ) {
        throw new Error(
            'REQUEST_INTERVAL_SECONDS must be at least 1 second.'
        );
    }

    if (
        !Number.isFinite(MAX_ACCOUNTS) ||
        MAX_ACCOUNTS < 0
    ) {
        throw new Error('MAX_ACCOUNTS must be zero or a positive number.');
    }

    console.log('Configuration validation: PASSED');
    console.log('Starting login audit...');
    console.log('====================================');

    return {
        totalAccounts: accounts.length,
    };
}

// ==========================================
// LOGIN CLASSIFICATION
// ==========================================

function classifyLogin(response) {
    let body = {};

    try {
        body = response.json();
    } catch (error) {
        body = {};
    }

    const success = body && body.success === true;
    const data = body && body.data ? body.data : {};

    if (
        response.status >= 200 &&
        response.status < 300 &&
        success &&
        data.requires_otp === true
    ) {
        return 'OTP_REQUIRED';
    }

    if (
        response.status >= 200 &&
        response.status < 300 &&
        success &&
        data.token
    ) {
        return 'SUCCESS';
    }

    if (response.status === 401) {
        return 'HTTP_401';
    }

    if (response.status === 403) {
        return 'HTTP_403';
    }

    if (response.status === 429) {
        return 'HTTP_429_RATE_LIMIT';
    }

    if (response.status >= 500) {
        return 'HTTP_5XX_SERVER_ERROR';
    }

    if (response.status === 0) {
        return 'NETWORK_ERROR';
    }

    if (response.status >= 200 && response.status < 300) {
        return 'HTTP_2XX_APP_FAILURE';
    }

    if (response.status >= 400) {
        return `HTTP_${response.status}`;
    }

    return 'UNKNOWN';
}

// ==========================================
// MAIN LOGIN AUDIT
// ==========================================

export default function (data) {
    const index = exec.scenario.iterationInTest;

    if (index >= accounts.length) {
        return;
    }

    const account = accounts[index];

    // Add interval between login requests.
    if (index > 0) {
        sleep(REQUEST_INTERVAL);
    }

    const endpoint = `${BASE_URL}/api/auth/login`;

    const payload = JSON.stringify({
        email: account.email,
        password: account.password,
        token: CAPTCHA_TOKEN,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        timeout: '30s',
        tags: {
            endpoint: 'login',
        },
    };

    let response;
    let result;
    let duration = 0;
    let status = 0;

    try {
        response = http.post(endpoint, payload, params);

        duration = response.timings.duration;
        status = response.status;

        loginDuration.add(duration);

        result = classifyLogin(response);

    } catch (error) {
        result = 'NETWORK_ERROR';
        loginNetworkError.add(1);
    }

    // Count results.
    if (result === 'SUCCESS') {
        loginSuccess.add(1);
    } else if (result === 'OTP_REQUIRED') {
        loginOtpRequired.add(1);
    } else {
        loginFailed.add(1);

        if (result === 'NETWORK_ERROR') {
            loginNetworkError.add(1);
        }
    }

    // Safe audit log: never log passwords, tokens or response bodies.
    const auditResult = {
        timestamp: new Date().toISOString(),
        account_id: account.id || '',
        name: account.name || '',
        email: account.email,
        role: account.role || '',
        http_status: status,
        result: result,
        duration_ms: Math.round(duration),
    };

    console.log(
        'LOGIN_AUDIT_RESULT ' + JSON.stringify(auditResult)
    );

    console.log(
        `[${index + 1}/${accounts.length}] ${account.email} => ${result} (HTTP ${status})`
    );

    // stop sesuai README: 429 / 5xx / network error
    if (
        STOP_ON_ERROR &&
        (status === 429 || status >= 500 || result === 'NETWORK_ERROR')
    ) {
        exec.test.abort(
            `Stopped at [${index + 1}/${accounts.length}] ${account.email}: ${result} (HTTP ${status})`
        );
    }
}
