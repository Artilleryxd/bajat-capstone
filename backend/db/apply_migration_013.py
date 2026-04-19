"""
Apply migration 013: adds recommended_sip and required_sip_for_goal to investment_strategies.

Usage:
  1. Get your Supabase Personal Access Token from:
     https://supabase.com/dashboard/account/tokens
  2. Run: python apply_migration_013.py
  3. Paste your PAT when prompted (or set SUPABASE_PAT env var).
"""
import os
import json
import pathlib
import requests

PROJECT_REF = "irjbugxvihxpmchaovfi"
SQL_FILE = pathlib.Path(__file__).parent / "migrations" / "013_investment_strategies_sip_fields.sql"

pat = os.environ.get("SUPABASE_PAT") or input("Supabase Personal Access Token: ").strip()

sql = SQL_FILE.read_text()

resp = requests.post(
    f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
    headers={
        "Authorization": f"Bearer {pat}",
        "Content-Type": "application/json",
    },
    json={"query": sql},
    timeout=30,
)

if resp.ok:
    print("Migration 013 applied successfully.")
    data = resp.json()
    if data:
        print(json.dumps(data, indent=2))
else:
    print(f"Error {resp.status_code}: {resp.text}")
