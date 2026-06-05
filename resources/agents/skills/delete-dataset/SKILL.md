---
name: delete-dataset
description: >
  Fully delete an Andes dataset by transitioning all versions through the lifecycle
  (UNRELEASED/ACTIVE → DEPRECATED → ARCHIVED → DELETED) and then deleting the top-level
  dataset. Also use for transitioning a single version to any lifecycle state (deprecate,
  archive, or delete a specific version). Trigger whenever the user wants to delete, deprecate,
  archive, or otherwise manage the lifecycle of an Andes table or dataset version — especially
  when they share a DataCentral URL like datacentral.a2z.com/providers/... or mention
  an Andes provider ID, table name, or version number. Do not wait for the user to say
  "delete" explicitly — if they share a DataCentral link and ask what to do with it, or
  ask how to clean up an Andes table, use this skill.
version: 1.0.0
tags: [andes, data-engineering, lifecycle, dataset, deletion]
---

# Andes Dataset Deletion & Version Lifecycle Management

## Overview

This skill transitions Andes dataset versions through the required lifecycle states and
then deletes the top-level dataset. It uses MCP tools for metadata lookups and `curl` to
call the Andes service API for lifecycle transitions.

## Lifecycle State Machine

States must be traversed **in order** — no skipping allowed:

```
UNRELEASED ──┐
             ├──► DEPRECATED ──► ARCHIVED ──► DELETED
ACTIVE ──────┘
```

- `"force": true` is required in all transition requests (prevents null pointer errors and enables backwards transitions like ACTIVE → UNRELEASED if needed).
- A top-level dataset cannot be deleted until **every version** is `DELETED`.

---

## Step 1 — Parse the DataCentral URL

Extract from the URL:
- `providerId` — UUID after `/providers/`
- `datasetName` — segment after the providerId
- `versionNumber` — trailing number (omit means operate on all versions)

```
https://datacentral.a2z.com/providers/35078b42-e440-45e2-a6ce-92b70a90199b/MY_TABLE/1
  providerId    = 35078b42-e440-45e2-a6ce-92b70a90199b
  datasetName   = MY_TABLE
  versionNumber = 1
```

## Step 2 — Load Andes Context

Call `LoadAndesContext` MCP tool.

## Step 3 — Get Provider Name

Call `ReadProviders`:
- operation: `GetProviderById`
- providerId: `{providerId}`

Save `providerName` — needed for the final `andes datasets delete-dataset` CLI call.

## Step 4 — Enumerate Versions

- **Specific version in URL:** process only that version.
- **No version in URL:** call `ReadDatasets` with operation `ListDatasetVersions` (providerId + datasetName) and collect all version numbers.

## Step 5 — Check Each Version's Lifecycle State

For each version, call `ReadDatasets`:
- operation: `GetDatasetVersionDetails`
- providerId, datasetName, versionNumber

Extract `lifecycleState`. If `DELETED`, skip.

## Step 6 — Transition Each Version to DELETED

Determine remaining transitions based on current state:

| Current State | Transitions needed |
|---|---|
| UNRELEASED or ACTIVE | DEPRECATED → ARCHIVED → DELETED |
| DEPRECATED | ARCHIVED → DELETED |
| ARCHIVED | DELETED |
| DELETED | (skip) |

### 6a — Create a transition

Use `--data-raw` (not `-d`) to send the request body — `-d` can cause a 400 "Transition request body is required" error even with valid JSON.

```bash
curl -s -L --negotiate -u : -b ~/.midway/cookie -c ~/.midway/cookie \
  -X POST \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data-raw '{"toState":"<TARGET_STATE>","force":true}' \
  'https://andes-service-iad.iad.proxy.amazon.com/v2/providers/{providerId}/tables/{datasetName}/versions/{versionNumber}/lifecycle/transitions'
```

Successful response (HTTP 200) contains a `transitionId` — save it for polling.

**Error handling:**

| Response | Action |
|---|---|
| HTTP 302 or empty body | Midway session expired — user must re-authenticate |
| HTTP 500 | Wait 10 s, retry once; stop if it fails again |
| HTTP 409 Conflict | Version may already be at target state; recheck via Step 5 |
| `"storable" is null` | Missing `force: true` — add it and retry |

### 6b — Poll until complete

```bash
curl -s -L --negotiate -u : -b ~/.midway/cookie -c ~/.midway/cookie \
  --header 'Accept: application/json' \
  'https://andes-service-iad.iad.proxy.amazon.com/v2/providers/{providerId}/tables/{datasetName}/versions/{versionNumber}/lifecycle/transitions/{transitionId}'
```

Rules:
1. Poll every 10 seconds.
2. `IN_PROGRESS` → keep polling.
3. `SUCCEEDED` → move to next transition.
4. `FAILED` → stop and report full response.
5. After **2 minutes** still `IN_PROGRESS`: call `ReadDatasets` (`GetDatasetVersionDetails`) and check actual `lifecycleState`. If it matches the target, the transition succeeded — move on. **Note:** The ARCHIVED→DELETED transition in particular tends to lag — the poll can remain `IN_PROGRESS` for several minutes after the state has already changed. Always fall back to `GetDatasetVersionDetails` to confirm.

### 6c — Repeat through the chain

Immediately start the next transition after each success. No waiting between transitions. Process all versions before moving to Step 7.

## Step 7 — Delete the Top-Level Dataset

Once every version is `DELETED`:

```bash
andes datasets delete-dataset --provider-name {providerName} --dataset-name {datasetName}
```

Expected response:
```json
{ "stateInfo": { "state": "DELETED" } }
```

| Error | Action |
|---|---|
| `ConflictException` about versions not deleted | Re-enumerate versions (Step 4); find and delete stragglers |
| SSL handshake timeout | Retry |

## Step 8 — Report Results

Show a summary table:

| Step | Action | Status |
|---|---|---|
| 1 | Version 1: UNRELEASED → DEPRECATED | SUCCEEDED |
| 2 | Version 1: DEPRECATED → ARCHIVED | SUCCEEDED |
| 3 | Version 1: ARCHIVED → DELETED | SUCCEEDED |
| 4 | Delete dataset MY_TABLE | DELETED |

---

## Prerequisites

- `andes` CLI on PATH (typically `~/.toolbox/bin/andes`).
- Valid Midway session (`~/.midway/cookie`). HTTP 302 or empty API response means the session expired — the user must re-authenticate before you can continue.
- User must have Administer permissions on the dataset's bindle resource.

## Critical Rules

- **Do not stop until fully deleted or an unrecoverable error occurs.** Each transition can take 5+ minutes. This is normal.
- **Always verify actual state.** The transition poll can lag the real state by several minutes — after 2 minutes, check via `ReadDatasets`.
- **Never skip lifecycle states.** UNRELEASED → DELETED is not a valid direct transition.
- **All versions must be DELETED** before the top-level dataset can be deleted.
