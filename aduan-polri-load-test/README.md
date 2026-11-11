# Aduan Polri - Login Account Audit (k6) — Re-run 513 akun lolos

Folder ini berisi ulang paket audit, dengan data akun hanya dari **513 akun yang SUCCESS** pada audit 9 Nov 2026
(6 akun HTTP 401 dikeluarkan). Struktur & script sama dengan paket sebelumnya.

| File | Isi |
|---|---|
| `users-polri-prod.xlsx` | 513 akun (header sama: id, name, email, password) |
| `accounts.json` | 513 akun, hasil `prepare_accounts.py` dari xlsx di atas |
| `accounts-batch-01.json` … `-05.json` | 100 / 100 / 100 / 100 / 113 akun (ID 1–125, 126–225, 226–325, 326–425, 426–538) |

Run per batch (ganti nomor batch & nama log):

```powershell
$env:ALLOW_PRODUCTION = "true"
k6 run `
  -e BASE_URL=https://polri.aduankonten.id `
  -e LOAD_CAPTCHA_TOKEN=bypass `
  -e ACCOUNTS_FILE=./accounts-batch-01.json `
  -e REQUEST_INTERVAL_SECONDS=2 `
  .\login-audit.k6.js 2>&1 | Tee-Object -FilePath .\k6-batch-01.log

python .\export_login_results.py --input .\k6-batch-01.log --output-dir .\results-batch-01
```

Pastikan nilai `ACCOUNTS_FILE` dan nama log sesuai batch — run batch-03 sebelumnya sempat memakai file akun batch lain.
`export_login_results.py` sudah bisa membaca log UTF-16 dari `Tee-Object` dan record yang terpotong line-wrap.

---

This package performs **login-only account validation**. It does not create complaints,
approve cases, or run the proposed 500-VU performance test.

## What it does

- Reads a local `accounts.json` file.
- Sends one `POST /api/auth/login` request per account, sequentially with one VU.
- Sends the backend-approved CAPTCHA value `bypass`.
- Records HTTP status, outcome category, timestamp, account identifier, and API duration.
- Produces `login-results.csv`, `failed-logins.csv`, and `login-summary.json`.
- Does not export passwords, access tokens, cookies, or raw response bodies.
- Stops on HTTP 429, HTTP 5xx, or network/timeout status by default.

## Production safeguards

Run only during the approved test window with the backend/operations team aware that
the CAPTCHA bypass is enabled and scoped to approved test accounts.

The script requires `ALLOW_PRODUCTION=true`, uses one VU, defaults to a 2-second pause
between accounts (nominal maximum 0.5 req/s), enforces a minimum 1-second pause, does not
retry failed accounts, and stops on 429/5xx/network errors.

The 2-second pause is a conservative starting setting, not a verified infrastructure
capacity limit. Increase it if operations specifies a lower request rate.

## 1. Prepare local account data

Use Python 3.10+.

```powershell
python -m pip install -r requirements.txt
python .\prepare_accounts.py --input .\users-polri-prod.xlsx --output .\accounts.json
```

The workbook must contain `email` and `password` headers. Optional columns: `id`, `name`,
`role`. The converter checks missing credentials and duplicate emails. Password cell values are preserved as-is (including leading/trailing spaces). It never prints
passwords. Keep `accounts.json` local; it is ignored by Git.

## 2. One-account smoke check

```powershell
$env:ALLOW_PRODUCTION = "true"
k6 run `
  -e BASE_URL=https://polri.aduankonten.id `
  -e LOAD_CAPTCHA_TOKEN=bypass `
  -e MAX_ACCOUNTS=1 `
  -e REQUEST_INTERVAL_SECONDS=2 `
  .\login-audit.k6.js 2>&1 | Tee-Object -FilePath .\k6-audit.log

python .\export_login_results.py --input .\k6-audit.log
```

Confirm the single request appears as expected in application/security monitoring before
continuing with the full account audit.

## 3. Full account audit

```powershell
$env:ALLOW_PRODUCTION = "true"
k6 run `
  -e BASE_URL=https://polri.aduankonten.id `
  -e LOAD_CAPTCHA_TOKEN=bypass `
  -e REQUEST_INTERVAL_SECONDS=2 `
  -e MAX_DURATION=45m `
  .\login-audit.k6.js 2>&1 | Tee-Object -FilePath .\k6-audit.log

python .\export_login_results.py --input .\k6-audit.log
```

By default, all accounts in `accounts.json` are selected. Each account is attempted once.
For 519 accounts at a 2-second pause, expect at least about 17 minutes plus request time.
The default maximum duration is 45 minutes.

## 4. Output files

- `login-results.csv`: every attempted account.
- `failed-logins.csv`: every outcome other than `SUCCESS`, including OTP-required accounts.
- `login-summary.json`: outcome counts and latency percentiles.
- `k6-audit.log`: raw k6 console output; keep it local and access-controlled.

## 5. Outcome categories

- `SUCCESS`: HTTP 2xx, `success=true`, and a login token exists without an OTP requirement.
- `OTP_REQUIRED`: backend requires OTP; not counted as completed login.
- `HTTP_401`, `HTTP_403`: HTTP status categories.
- `RATE_LIMITED`: HTTP 429.
- `SERVER_ERROR`: HTTP 5xx.
- `NETWORK_OR_TIMEOUT`: k6 received status 0.
- `BUSINESS_FAILURE`: HTTP 2xx but `success=false`.
- `UNEXPECTED_2XX_RESPONSE` / `UNEXPECTED_HTTP_STATUS`: response shape/status is unexpected.

A 401 or 403 is not automatic proof that the password is wrong. Confirm the backend
response reason and account state before classifying the account.

## 6. Latency interpretation

`login_duration` measures the HTTP request duration for `POST /api/auth/login`, not full
browser page load or the subsequent `/api/auth/me` request.

The script counts requests over 3,000 ms and over 4,000 ms. Thresholds are p95 < 3,000 ms
and p99 < 4,000 ms. A threshold failure does not discard CSV records.

## 7. Before larger performance testing

Do not turn this audit into a 500-VU run. First review account audit results, CAPTCHA
bypass scope, role mapping, rate limits, and production monitoring with the system owner
and operations team. A separate performance scenario needs an approved RPS ceiling,
stop conditions, and a dedicated test window.
