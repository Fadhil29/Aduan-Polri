import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path

PREFIX = "LOGIN_AUDIT_RESULT "
FIELDS = [
    "timestamp", "account_id", "name", "email", "role",
    "http_status", "result", "duration_ms",
]


def percentile(values, p):
    if not values:
        return None
    rank = max(1, int((p / 100.0) * len(values) + 0.999999))
    return round(values[min(rank - 1, len(values) - 1)], 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="k6-audit.log")
    parser.add_argument("--output-dir", default=".")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    if not input_path.exists():
        raise SystemExit(f"Input log not found: {input_path}")

    records = []
    malformed = 0
    raw = input_path.read_bytes()
    # log dari Tee-Object PowerShell default-nya UTF-16
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        text = raw.decode("utf-16", errors="replace")
    else:
        text = raw.decode("utf-8-sig", errors="replace")
    # record bisa terpotong line-wrap console, jadi cari per msg bukan per baris
    for match in re.finditer(r'msg="LOGIN_AUDIT_RESULT\s*(\{.*?\})"\s*source=console', text, re.S):
        payload = match.group(1).replace("\r", "").replace("\n", "").replace('\\"', '"')
        try:
            item = json.loads(payload)
            item["name"] = re.sub(r"\s+", " ", str(item.get("name", ""))).strip()
            records.append({field: item.get(field, "") for field in FIELDS})
        except json.JSONDecodeError:
            malformed += 1

    if not records:
        raise SystemExit("No LOGIN_AUDIT_RESULT records found in the k6 log.")

    def write_csv(path, rows):
        with path.open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows)

    all_path = output_dir / "login-results.csv"
    failed_path = output_dir / "failed-logins.csv"
    write_csv(all_path, records)
    failed = [row for row in records if row["result"] != "SUCCESS"]
    write_csv(failed_path, failed)

    outcomes = Counter(row["result"] for row in records)
    durations = sorted(
        float(row["duration_ms"]) for row in records
        if row["duration_ms"] not in ("", None)
    )
    summary = {
        "records_captured": len(records),
        "successful_logins": outcomes.get("SUCCESS", 0),
        "failed_or_incomplete_logins": len(failed),
        "outcomes": dict(outcomes),
        "duration_ms": {
            "p50": percentile(durations, 50),
            "p95": percentile(durations, 95),
            "p99": percentile(durations, 99),
            "max": max(durations) if durations else None,
        },
        "malformed_log_lines": malformed,
        "notes": [
            "HTTP 401/403 are status categories, not automatic proof of wrong passwords.",
            "OTP_REQUIRED is not counted as a completed login.",
            "Passwords, access tokens, cookies, and raw response bodies are not exported.",
        ],
    }
    summary_path = output_dir / "login-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Captured records : {len(records)}")
    print(f"Successful       : {summary['successful_logins']}")
    print(f"Failed/incomplete: {summary['failed_or_incomplete_logins']}")
    print(f"All results      : {all_path}")
    print(f"Failed accounts  : {failed_path}")
    print(f"Summary          : {summary_path}")


if __name__ == "__main__":
    main()
