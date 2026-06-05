#!/usr/bin/env python3
"""
backfill.py — Launch Cradle adhoc job runs for a date range, chunked into windows.

Usage:
    python3 backfill.py --profile <profileId> --job <jobId> \
        --start YYYY-MM-DD --end YYYY-MM-DD \
        [--window-days 90] [--service-tier NORMAL] [--dry-run]

    --profile       Cradle profile ID
    --job           Cradle job ID
    --start         Backfill start date (inclusive), YYYY-MM-DD
    --end           Backfill end date (inclusive), YYYY-MM-DD
    --window-days   Days per chunk / window (default: 90).
                    Each run is submitted with the END date of the window as
                    the datasetDate. Use this when the job has an output_days
                    variable that already defines the window size (e.g. 90).
    --service-tier  NORMAL (default) or LOW
    --dry-run       Print what would be submitted without actually calling the API
    --poll          After launching, immediately start polling (every 3 min)

The script:
  1. Chunks the date range into windows of --window-days each
  2. Pre-flight checks each job for conflicting active/queued runs
  3. Launches one adhoc run per window using the window end date as datasetDate
  4. Writes a state file (cradle_backfill_state.json) to the current directory
  5. Optionally polls until all runs complete

Authentication: uses ~/.midway/cookie (run `mwinit` if you get empty responses).
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import date, timedelta, datetime, timezone

BASE_URL = "https://dryadservice-na-iad.iad.proxy.amazon.com"
TERMINAL = {"SUCCEEDED", "SUCCESS", "FAILED", "CANCELLED", "CANCELED"}
BLOCKING = {"RUNNING", "ACTIVE", "WAITING_FOR_RESOURCES", "WAITING_FOR_DEPENDENCIES"}


def dryad_request(method: str, path: str, body: dict = None) -> dict:
    url = f"{BASE_URL}{path}"
    cmd = [
        "curl", "-s", "-L", "--negotiate", "-u", ":",
        "-b", os.path.expanduser("~/.midway/cookie"),
        "-c", os.path.expanduser("~/.midway/cookie"),
        "--header", "Accept: application/vnd.dryad.v1+json",
        "-X", method,
    ]
    if body is not None:
        cmd += ["--header", "Content-Type: application/vnd.dryad.v1+json",
                "--data-raw", json.dumps(body)]
    cmd.append(url)

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if not result.stdout.strip():
        print(f"  ⚠️  Empty response for {method} {path} — check Midway session.", file=sys.stderr)
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        # Some endpoints (e.g. :cancel, :forceDependencies) return {} or empty on success
        return {}


def chunk_windows(start: date, end: date, window_days: int) -> list[tuple[date, date]]:
    """Returns list of (window_start, window_end) tuples."""
    windows = []
    current = start
    while current <= end:
        window_end = min(current + timedelta(days=window_days - 1), end)
        windows.append((current, window_end))
        current = window_end + timedelta(days=1)
    return windows


def preflight_check(profile_id: str, job_id: str) -> list[dict]:
    """Returns list of runs currently in a blocking state."""
    path = f"/profiles/{profile_id}/jobs/{job_id}/jobRuns"
    d = dryad_request("GET", path)
    runs = d.get("page", d.get("jobRuns", []))
    return [r for r in runs if r.get("status", "").upper() in BLOCKING]


def launch_run(profile_id: str, job_id: str, dataset_date: date, service_tier: str) -> dict:
    """Launches a single adhoc run. Returns the jobRun dict."""
    ds = dataset_date.strftime("%Y%m%dT00:00:00+0000")
    body = {
        "jobRunParameters": {
            "runType": "Adhoc",
            "datasetDate": ds,
            "serviceTier": service_tier,
        }
    }
    resp = dryad_request("POST", f"/profiles/{profile_id}/jobs/{job_id}/jobRuns", body)
    return resp.get("jobRun", resp)


def poll_all(profile_id: str, job_id: str, run_records: list, interval: int = 180) -> None:
    """Poll all runs until terminal, printing a table every interval seconds."""
    start_time = time.time()
    cycle = 0

    while True:
        cycle += 1
        now = datetime.now(timezone.utc)
        elapsed_total = int((now.timestamp() - start_time) / 60)

        statuses = []
        for rec in run_records:
            path = f"/profiles/{profile_id}/jobs/{job_id}/jobRuns/{rec['runId']}"
            d = dryad_request("GET", path)
            jr = d.get("jobRun", d)
            statuses.append(jr.get("status", "?"))

        print(f"\n{'='*72}", flush=True)
        print(f"Poll cycle {cycle} — {now.strftime('%H:%M:%S UTC')}  (elapsed: {elapsed_total}m)", flush=True)
        print(f"{'='*72}", flush=True)
        print(f"{'Win':<5} {'datasetDate':<14} {'Status':<30} {'Run ID'}", flush=True)
        print(f"{'-'*5} {'-'*14} {'-'*30} {'-'*32}", flush=True)
        for rec, status in zip(run_records, statuses):
            icon = "✅" if status in ("SUCCEEDED", "SUCCESS") \
                   else "❌" if status in ("FAILED", "CANCELLED", "CANCELED") \
                   else "⏳"
            print(f"{icon} {rec['window']:<4} {rec['datasetDate']:<14} {status:<30} {rec['runId']}", flush=True)
            rec["status"] = status

        done = sum(1 for s in statuses if s in TERMINAL)
        print(f"\n  {done}/{len(run_records)} terminal  |  active/queued: {len(run_records)-done}", flush=True)

        if all(s in TERMINAL for s in statuses):
            failed = [rec for rec in run_records if rec["status"] in ("FAILED", "CANCELLED", "CANCELED")]
            if failed:
                print(f"\n⚠️  {len(failed)} run(s) did not succeed:", flush=True)
                for rec in failed:
                    print(f"  Window {rec['window']} ({rec['datasetDate']}): {rec['status']} — {rec['runId']}", flush=True)
            else:
                print(f"\n✅ All {len(run_records)} runs SUCCEEDED", flush=True)
            break

        print(f"\n  Next poll in {interval // 60}m...", flush=True)
        time.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description="Launch Cradle backfill runs chunked by window.")
    parser.add_argument("--profile", required=True)
    parser.add_argument("--job", required=True)
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD (inclusive)")
    parser.add_argument("--end", required=True, help="End date YYYY-MM-DD (inclusive)")
    parser.add_argument("--window-days", type=int, default=90)
    parser.add_argument("--service-tier", default="NORMAL", choices=["NORMAL", "LOW"])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--poll", action="store_true", help="Poll runs after launching")
    args = parser.parse_args()

    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end)
    windows = chunk_windows(start, end, args.window_days)

    print(f"\nBackfill plan: {args.start} → {args.end}")
    print(f"  Window size : {args.window_days} days")
    print(f"  Total windows: {len(windows)}")
    print(f"  Service tier: {args.service_tier}")
    if args.dry_run:
        print("  [DRY RUN — no API calls will be made]")
    print()

    for i, (ws, we) in enumerate(windows, 1):
        print(f"  Window {i:>2}: {ws} → {we}  (datasetDate={we})")

    if args.dry_run:
        print("\nDry run complete. Remove --dry-run to launch.")
        return

    # Pre-flight check
    print("\nRunning pre-flight check for active/queued runs...")
    blocking = preflight_check(args.profile, args.job)
    if blocking:
        print(f"\n⚠️  Found {len(blocking)} run(s) in blocking state:")
        for r in blocking:
            print(f"  {r.get('id')} — {r.get('status')} — {r.get('jobRunParameters', {}).get('datasetDate','?')}")
        print("\nCancel conflicting runs before proceeding, or confirm they cover different date ranges.")
        ans = input("Continue anyway? [y/N] ").strip().lower()
        if ans != "y":
            print("Aborted.")
            return
    else:
        print("  ✅ No conflicting runs found.\n")

    # Launch runs
    run_records = []
    for i, (ws, we) in enumerate(windows, 1):
        print(f"Launching window {i}/{len(windows)}: datasetDate={we}...", end=" ", flush=True)
        jr = launch_run(args.profile, args.job, we, args.service_tier)
        run_id = jr.get("id", "?")
        status = jr.get("status", "?")
        error  = jr.get("message")
        if error:
            print(f"ERROR: {error}")
        else:
            print(f"{run_id}  [{status}]")
        run_records.append({
            "window": i,
            "windowStart": ws.isoformat(),
            "datasetDate": we.isoformat(),
            "runId": run_id,
            "status": status,
        })

    # Write state file
    state = {
        "profileId": args.profile,
        "jobId": args.job,
        "launchedAt": datetime.now(timezone.utc).isoformat(),
        "runs": run_records,
    }
    state_path = "cradle_backfill_state.json"
    with open(state_path, "w") as f:
        json.dump(state, f, indent=2)

    launched = sum(1 for r in run_records if r["runId"] != "?")
    print(f"\n{launched}/{len(windows)} runs launched. State saved to {state_path}")

    if args.poll:
        print("\nStarting polling (every 3 min)...")
        poll_all(args.profile, args.job, run_records, interval=180)


if __name__ == "__main__":
    main()
