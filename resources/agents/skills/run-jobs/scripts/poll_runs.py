#!/usr/bin/env python3
"""
poll_runs.py — Poll Cradle job run statuses and print a live status table.

Usage:
    python3 poll_runs.py --profile <profileId> --job <jobId> \
        --runs <runId1> <runId2> ... [--labels label1 label2 ...] \
        [--interval 180]

    --profile    Cradle profile ID
    --job        Cradle job ID
    --runs       One or more job run IDs to poll
    --labels     Optional display labels (e.g. datasetDates). Must match --runs count.
    --interval   Poll interval in seconds (default: 180 = 3 min)

The script polls every --interval seconds and prints a status table until all runs
reach a terminal state (SUCCESS, SUCCEEDED, FAILED, CANCELLED, CANCELED).
Failed runs are reported at the end.

Authentication: uses ~/.midway/cookie (run `mwinit` if you see empty responses).
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

BASE_URL = "https://dryadservice-na-iad.iad.proxy.amazon.com"
TERMINAL = {"SUCCEEDED", "SUCCESS", "FAILED", "CANCELLED", "CANCELED"}


def dryad_get(url: str) -> dict:
    result = subprocess.run(
        [
            "curl", "-s", "-L", "--negotiate", "-u", ":",
            "-b", os.path.expanduser("~/.midway/cookie"),
            "-c", os.path.expanduser("~/.midway/cookie"),
            "--header", "Accept: application/vnd.dryad.v1+json",
            url,
        ],
        capture_output=True,
        text=True,
        timeout=15,
    )
    if not result.stdout.strip():
        print("  ⚠️  Empty response — Midway session may have expired. Run `mwinit`.", file=sys.stderr)
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"  ⚠️  Unparseable response: {result.stdout[:200]}", file=sys.stderr)
        return {}


def get_run_status(profile_id: str, job_id: str, run_id: str) -> tuple[str, str]:
    """Returns (status, dataCentralUrl)."""
    url = f"{BASE_URL}/profiles/{profile_id}/jobs/{job_id}/jobRuns/{run_id}"
    d = dryad_get(url)
    jr = d.get("jobRun", d)
    return jr.get("status", "?"), jr.get("dataCentralUrl", "")


def print_table(runs: list, statuses: list, cycle: int, start_time: float) -> None:
    now = datetime.now(timezone.utc)
    elapsed_total = int((now.timestamp() - start_time) / 60)
    print(f"\n{'='*72}", flush=True)
    print(f"Poll cycle {cycle} — {now.strftime('%H:%M:%S UTC')}  (total elapsed: {elapsed_total}m)", flush=True)
    print(f"{'='*72}", flush=True)
    print(f"{'#':<4} {'Label':<20} {'Status':<30} {'Run ID'}", flush=True)
    print(f"{'-'*4} {'-'*20} {'-'*30} {'-'*32}", flush=True)
    for i, ((run_id, label), (status, dc_url)) in enumerate(zip(runs, statuses), 1):
        icon = "✅" if status in ("SUCCEEDED", "SUCCESS") \
               else "❌" if status in ("FAILED", "CANCELLED", "CANCELED") \
               else "⏳"
        print(f"{icon} {i:<3} {label:<20} {status:<30} {run_id}", flush=True)

    done = sum(1 for s, _ in statuses if s in TERMINAL)
    print(f"\n  {done}/{len(runs)} terminal  |  active/queued: {len(runs) - done}", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Poll Cradle job run statuses.")
    parser.add_argument("--profile", required=True, help="Cradle profile ID")
    parser.add_argument("--job", required=True, help="Cradle job ID")
    parser.add_argument("--runs", required=True, nargs="+", help="Job run IDs to poll")
    parser.add_argument("--labels", nargs="+", help="Display labels (e.g. datasetDates)")
    parser.add_argument("--interval", type=int, default=180, help="Poll interval in seconds (default: 180)")
    args = parser.parse_args()

    labels = args.labels or args.runs
    if len(labels) != len(args.runs):
        print("Error: --labels count must match --runs count", file=sys.stderr)
        sys.exit(1)

    runs = list(zip(args.runs, labels))
    start_time = time.time()
    cycle = 0

    while True:
        cycle += 1
        statuses = [get_run_status(args.profile, args.job, run_id) for run_id, _ in runs]
        print_table(runs, statuses, cycle, start_time)

        if all(s in TERMINAL for s, _ in statuses):
            failed = [
                (label, run_id, s)
                for (run_id, label), (s, _) in zip(runs, statuses)
                if s in ("FAILED", "CANCELLED", "CANCELED")
            ]
            if failed:
                print(f"\n⚠️  {len(failed)} run(s) did not succeed:", flush=True)
                for label, run_id, s in failed:
                    print(f"  {label} ({run_id}): {s}", flush=True)
                print("\nFetch error logs with:", flush=True)
                print(f"  ReadJobRuns(operation='find_last_exceptions', profileId='{args.profile}',", flush=True)
                print(f"              jobId='{args.job}', jobRunId='<runId>')", flush=True)
            else:
                print(f"\n✅ All {len(runs)} runs SUCCEEDED", flush=True)
            break

        print(f"\n  Next poll in {args.interval // 60}m {args.interval % 60}s...", flush=True)
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
