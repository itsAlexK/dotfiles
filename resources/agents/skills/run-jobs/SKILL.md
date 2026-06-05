---
name: run-jobs
description: >
  How to start Cradle job runs, poll their status, retrieve error logs, and manage
  multiple jobs in parallel. Use this skill whenever the user wants to trigger a Cradle
  job, backfill data, check on a running or failed job, retrieve Spark error logs, or
  manage a batch of concurrent Cradle runs. Trigger on phrases like "run this cradle job",
  "start a backfill", "why did my cradle job fail", "get me the error logs", "run these
  jobs in parallel", or anytime a Cradle job run URL
  (datacentral.a2z.com/cradle#/...) is shared.
version: 1.0.0
tags: [cradle, data-engineering, job-runs, dryad, spark, backfill]
---

# Cradle Job Runs

## Overview

Cradle jobs are managed through two complementary layers:
- **MCP tools** (`cradle-mcp`) — read-only: search profiles/jobs, inspect run status and logs
- **DryadService REST API** — write operations: create job runs, cancel runs, force dependencies

Authentication for REST calls uses Midway cookies (`~/.midway/cookie`). An empty or 302
response means the session has expired — tell the user to run `mwinit` before retrying.

**Required headers for all REST calls:**
```
Content-Type: application/vnd.dryad.v1+json
Accept: application/vnd.dryad.v1+json
```

**Response shape:** job run responses wrap results in a `.jobRun` object:
- `.jobRun.id` — the run ID
- `.jobRun.status` — current status (see states below)
- `.jobRun.dataCentralUrl` — direct DataCentral link

## Bundled scripts

Two reusable scripts live in `scripts/`:

| Script | Purpose |
|---|---|
| `scripts/backfill.py` | Launch adhoc runs chunked into date windows, with pre-flight check and optional polling |
| `scripts/poll_runs.py` | Poll a known list of run IDs until all reach terminal state |

**Backfill example** (2 years, 90-day windows, then poll):
```bash
python3 scripts/backfill.py \
  --profile <profileId> --job <jobId> \
  --start 2024-04-09 --end 2026-04-09 \
  --window-days 90 --poll
```

**Poll-only example** (after runs are already launched):
```bash
python3 scripts/poll_runs.py \
  --profile <profileId> --job <jobId> \
  --runs <runId1> <runId2> <runId3> \
  --labels "2024-07-07" "2024-10-05" "2025-01-03"
```

Use `--dry-run` on `backfill.py` to preview windows before launching anything.

### DataCentral URL anatomy

```
https://datacentral.a2z.com/cradle#/{account}/profiles/{profileId}/jobs/{jobId}/runs/{jobRunId}
```

---

## Step 1 — Find the Profile and Job

If the user gives you a DataCentral URL, extract `profileId`, `jobId`, and optionally `jobRunId` directly from it and skip this step.

Otherwise, search by name:

```
SearchProfiles(searchTerm: "<profile name>", accountName: "<account>")
```

Then list **all jobs** under the profile:

```
ReadJobs(operation: "list_jobs", profileId: "<profileId>")
```

This returns every job defined under the profile. Each entry includes `jobId`, `name`,
schedule frequency, and last run status.

A single profile commonly has **many jobs — one per region or marketplace** (e.g. one
job for US, one for UK, one for JP, etc.). Job names typically encode the region ID or
marketplace ID, for example: `DmpAsinsGenerator-US-1`, `DmpAsinsGenerator-UK-771770`.
When the user says "run the job for US" or "backfill all regions", list all jobs first
and match against the name to identify the right subset.

If the user asked to run a specific job by name or region, find the matching entry and
save its `jobId`. If they want to run all jobs (all regions), collect every `jobId`
before proceeding — and expect to manage a large set of parallel runs.

Save `profileId` and `jobId` (or a list of them) — both are required for all subsequent operations.

---

## Step 2 — Pre-flight: Check for Active Runs

Before creating any new run, check whether an active or queued run already exists for
each job. Launching a duplicate run wastes cluster resources and can produce conflicting
output data.

```
ReadJobRuns(
  operation: "list_job_runs",
  profileId: "<profileId>",
  jobId: "<jobId>",
  pageSize: 20
)
```

From the returned list, filter for runs in blocking states: `active`,
`waiting_for_resources`, or `waiting_for_dependencies`. Then decide per job:

| Situation | Action |
|---|---|
| No runs in blocking states | Safe to proceed |
| Run exists for a **different** date range | Safe to proceed — ranges don't conflict |
| Run exists for the **same** date range | Cancel it using the command below, then proceed |
| Run in `active` state and you need a fresh run | Confirm with the user before cancelling — an active run may be producing valid output |

### Cancel a conflicting run

```bash
curl -s -L --negotiate -u : -b ~/.midway/cookie -c ~/.midway/cookie \
  -X POST \
  'https://dryadservice-na-iad.iad.proxy.amazon.com/profiles/<profileId>/jobs/<jobId>/jobRuns/<jobRunId>:cancel'
```

If running multiple jobs (e.g. one per region/marketplace), perform this check for all
of them before launching any. Record which jobs needed cancellation in the state file.

---

## Step 3 — Start a Job Run

Use the DryadService REST API. Always use `https://dryadservice-na-iad.iad.proxy.amazon.com` regardless of account region. The URL path always includes the profileId and jobId.

### Option A — Single run (one datasetDate)

```bash
curl -s -L --negotiate -u : -b ~/.midway/cookie -c ~/.midway/cookie \
  -X POST \
  --header 'Content-Type: application/vnd.dryad.v1+json' \
  --header 'Accept: application/vnd.dryad.v1+json' \
  --data-raw '{
    "jobRunParameters": {
      "runType": "Adhoc",
      "datasetDate": "<YYYYMMDDThh:mm:ss+0000>",
      "serviceTier": "NORMAL"
    }
  }' \
  'https://dryadservice-na-iad.iad.proxy.amazon.com/profiles/<profileId>/jobs/<jobId>/jobRuns'
```

A successful response returns a JSON object — extract `.jobRun.id` as your `jobRunId`.

### Option B — Batch run (date range, up to 62 days per call)

Use this for backfills. Creates one run per day in the range, up to 62 days. Chunk
larger ranges into multiple batch calls.

```bash
curl -s -L --negotiate -u : -b ~/.midway/cookie -c ~/.midway/cookie \
  -X POST \
  --header 'Content-Type: application/vnd.dryad.v1+json' \
  --header 'Accept: application/vnd.dryad.v1+json' \
  --data-raw '{
    "jobRunParameters": {
      "startDate": "<YYYYMMDD>",
      "endDate": "<YYYYMMDD>",
      "executionOrder": "OrderByDateAsc",
      "maxConcurrency": 5
    }
  }' \
  'https://dryadservice-na-iad.iad.proxy.amazon.com/profiles/<profileId>/jobs/<jobId>/jobRuns/batch'
```

Response includes `numberOfSuccessfulJobRuns`, `numberOfFailedJobRuns`, and `totalJobRuns`.

When running one job per region/marketplace, repeat either call for each `jobId` using
the same `profileId`. Each job produces its own run ID(s) — track them all.

**Key parameters:**
| Field | Notes |
|---|---|
| `datasetDate` | ISO format: `20240409T00:00:00+0000` |
| `startDate` / `endDate` | Batch range in `YYYYMMDD` format — max 62 days per call |
| `runType` | `"Adhoc"` for single runs; omit for batch |
| `serviceTier` | `"NORMAL"` is standard; `"LOW"` for deprioritized backfills |
| `maxConcurrency` | How many daily runs execute in parallel within the batch |

---

## Step 4 — Poll Job Status

Use the MCP tool to check status — no REST call needed:

```
ReadJobRuns(
  operation: "get_job_run_details",
  profileId: "<profileId>",
  jobId: "<jobId>",
  jobRunId: "<jobRunId>"
)
```

Or to get the latest run without knowing the run ID:

```
ReadJobRuns(
  operation: "list_job_runs",
  profileId: "<profileId>",
  jobId: "<jobId>",
  latestRunOnly: true
)
```

### Status states

| Status | Meaning |
|---|---|
| `WAITING_FOR_RESOURCES` | Queued, waiting for cluster capacity |
| `WAITING_FOR_DEPENDENCIES` | Blocked on upstream data not yet complete |
| `RUNNING` | Currently executing |
| `SUCCEEDED` / `SUCCESS` | Completed successfully |
| `FAILED` | Completed with errors |
| `CANCELLED` / `CANCELED` | Manually cancelled or pre-empted |

**Terminal states:** `SUCCEEDED`, `SUCCESS`, `FAILED`, `CANCELLED`, `CANCELED` — stop polling once reached.

**Polling cadence:** Poll every **3 minutes**. Cradle jobs on `NORMAL` tier typically
take 10–60 minutes depending on data volume. Always print the full status table to the
user after every poll cycle so they can see live progress.

**Stuck on `WAITING_FOR_DEPENDENCIES`?** Upstream Andes data for that date isn't
complete yet. Two options:

1. **Wait** — upstream jobs may still be running; re-check after a few minutes.
2. **Force dependencies** — bypasses the dependency check and runs anyway. Only do this
   if you're confident the upstream data is available or you want to run regardless.
   **Always confirm with the user before forcing.**

```bash
# Force dependencies for a stuck run — confirm with user first
curl -s -L --negotiate -u : -b ~/.midway/cookie -c ~/.midway/cookie \
  -X POST \
  'https://dryadservice-na-iad.iad.proxy.amazon.com/profiles/<profileId>/jobs/<jobId>/jobRuns/<jobRunId>:forceDependencies'
```

For a detailed dependency report before deciding:

```
mcp__andes-mcp__DebugCradleJobRunWFD(
  jobRunUrl: "https://datacentral.a2z.com/cradle#/...",
  andes_mcp_user_context: "Investigating why job run is stuck on WAITING_FOR_DEPENDENCIES"
)
```

---

## Step 5 — Retrieve Error Logs

When a run `failed`, get the driver log exceptions first — this is usually enough to
identify the root cause:

```
ReadJobRuns(
  operation: "find_last_exceptions",
  profileId: "<profileId>",
  jobId: "<jobId>",
  jobRunId: "<jobRunId>"
)
```

This surfaces the tail of the Spark driver log with exception stack traces. For deeper
analysis (executor failures, stage-level errors, skew), launch Spark History:

```
LaunchSparkHistory(
  operation: "LAUNCH_SESSION",
  profileId: "<profileId>",
  jobId: "<jobId>",
  runId: "<jobRunId>"
)
```

Or if you have the DataCentral URL:

```
LaunchSparkHistory(
  operation: "LAUNCH_SESSION",
  url: "https://datacentral.a2z.com/cradle#/..."
)
```

Check session readiness before navigating:

```
CheckSparkHistoryStatus(
  operation: "CHECK_SESSION_STATUS",
  profileId: "<profileId>",
  jobId: "<jobId>",
  runId: "<jobRunId>"
)
```

---

## Step 6 — Running Multiple Jobs in Parallel

When backfilling or triggering multiple jobs simultaneously, maintain a state file to
track progress across runs. This is especially important when polling — you don't want
to lose track of which runs have finished.

### State file format

Write a `job_runs_state.json` to the working directory at the start and update it as
runs complete:

```json
{
  "runs": [
    {
      "label": "DmpAsinsGenerator-US-1",
      "regionId": 1,
      "marketplace": "US",
      "profileId": "abc123",
      "jobId": "def456",
      "jobRunId": "ghi789",
      "startDate": "2024-01-15",
      "endDate": "2024-01-15",
      "status": "active",
      "startedAt": "2026-04-09T14:00:00Z",
      "completedAt": null,
      "dataCentralUrl": "https://datacentral.a2z.com/cradle#/..."
    }
  ],
  "summary": {
    "total": 5,
    "succeeded": 2,
    "active": 2,
    "failed": 0,
    "waiting": 1
  }
}
```

Use the job name as `label` — since jobs are named after their region/marketplace, this
makes the state file self-documenting without needing a separate display name.

### Choosing the right backfill strategy

If the job has an `output_days` variable (visible in job details under **Job Variables**),
each single run already covers a multi-day window — use the **end date** of each window
as the `datasetDate`. For example, a job with `output_days=90` and `datasetDate=2024-07-07`
outputs data from `2024-04-08` to `2024-07-07`. You only need one run per 90-day chunk,
not one per day. `backfill.py` implements this pattern automatically.

If the job has no `output_days` and processes exactly one day per run, use the batch API
(Option B in Step 3) or loop through individual dates.

### Parallel launch pattern

1. Run the Step 2 pre-flight check for **all** jobs first — cancel any conflicts — then
   fire all `POST /jobRuns` requests back-to-back.
2. Collect all returned `jobRunId` values and populate the state file immediately.
3. Poll all active runs every **3 minutes** — print the full table each cycle.
4. Use `scripts/poll_runs.py` rather than writing a custom polling loop.

### Progress summary table (print after each poll cycle)

| Job (Region) | Status | Duration | DataCentral |
|---|---|---|---|
| DmpAsinsGenerator-US-1 | succeeded | 18 min | [link] |
| DmpAsinsGenerator-UK-771770 | active | 12 min | [link] |
| DmpAsinsGenerator-JP-6 | waiting_for_resources | — | [link] |

Stop polling when all runs reach a terminal state. If any runs failed, immediately
call `find_last_exceptions` for each failed run and include the errors in your final
report.

---

## Prerequisites

- Valid Midway session (`~/.midway/cookie`). Run `mwinit` if you see empty responses
  or HTTP 302 redirects.
- You need the Cradle account name (e.g., `AAHydraAlchemy-prod-NA`) or a DataCentral
  URL to locate profiles and jobs.
- Write access (IAM/Bindle) to the Cradle account to create or cancel runs.

## DryadService API endpoint

Always use: `https://dryadservice-na-iad.iad.proxy.amazon.com`

This is the single endpoint for all Cradle accounts regardless of region or marketplace.
