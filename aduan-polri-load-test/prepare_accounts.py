import argparse
import json
import sys
from pathlib import Path
from openpyxl import load_workbook


def norm(value):
    return str(value).strip() if value is not None else ""


def main():
    parser = argparse.ArgumentParser(
        description="Convert an account XLSX file to accounts.json for k6."
    )
    parser.add_argument("--input", default="users-polri-prod.xlsx")
    parser.add_argument("--output", default="accounts.json")
    args = parser.parse_args()

    source = Path(args.input)
    destination = Path(args.output)
    if not source.exists():
        print(f"ERROR: input file not found: {source}", file=sys.stderr)
        return 2

    workbook = load_workbook(source, read_only=True, data_only=True)
    sheet = workbook.active
    rows = sheet.iter_rows(values_only=True)
    try:
        header_row = next(rows)
    except StopIteration:
        print("ERROR: workbook is empty.", file=sys.stderr)
        return 2

    headers = [norm(value).lower() for value in header_row]
    indexes = {name: idx for idx, name in enumerate(headers) if name}
    missing = [field for field in ("email", "password") if field not in indexes]
    if missing:
        print("ERROR: required column(s) missing: " + ", ".join(missing), file=sys.stderr)
        return 2

    accounts = []
    seen_emails = set()
    invalid_rows = []

    for excel_row_number, values in enumerate(rows, start=2):
        email = norm(values[indexes["email"]] if indexes["email"] < len(values) else "")
        password_value = values[indexes["password"]] if indexes["password"] < len(values) else None
        password = "" if password_value is None else str(password_value)

        if not email and not password:
            continue
        if not email or password == "":
            invalid_rows.append(excel_row_number)
            continue

        email_key = email.casefold()
        if email_key in seen_emails:
            invalid_rows.append(excel_row_number)
            continue
        seen_emails.add(email_key)

        account = {"email": email, "password": password}
        for optional_column in ("id", "name", "role"):
            if optional_column in indexes:
                value = norm(values[indexes[optional_column]]
                             if indexes[optional_column] < len(values) else "")
                if value:
                    account[optional_column] = value
        accounts.append(account)

    workbook.close()

    if invalid_rows:
        print(
            "ERROR: missing credentials or duplicate email in Excel row(s): "
            + ", ".join(map(str, invalid_rows))
            + ". No JSON file was written.",
            file=sys.stderr,
        )
        return 2
    if not accounts:
        print("ERROR: no usable accounts found.", file=sys.stderr)
        return 2

    destination.write_text(json.dumps(accounts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared {len(accounts)} account(s) in {destination}.")
    print("Credentials were not printed. Keep this file local and do not commit it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
