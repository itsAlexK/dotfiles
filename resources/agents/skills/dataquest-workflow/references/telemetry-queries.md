# Telemetry query recipes (`query_telemetry`)

`query_telemetry(query, start, end)` runs an arbitrary CloudWatch Logs
Insights query against the fleet's tool-invocation log group
`/aws/dataquest/tool-invocations` (account `057917758791`, us-west-2).

**Access:** suchikumi-dev admins only. Reads require assuming
`DataQuestTelemetryReader`, whose Bindle CanAssume is granted only to the
`suchikumi-dev` Team. A non-member's call fails at credential assume — the
boundary is IAM/Bindle, not a client-side check.

**Arguments**
- `query` — Logs Insights query string. **Do not** add a `SOURCE` line; the
  log group is fixed.
- `start` / `end` — relative ISO duration (`-PT24H`, `-P7D`, `-P30D`,
  `-P0D`), epoch seconds, or ISO timestamp (`2026-05-30T00:00:00Z`).
  Defaults: `start=-P30D`, `end=-P0D`.

**Available fields per event:** `User`, `Tool`, `Success`, `LatencyMs`,
`user_prompt`, `params_json`, `error`, `error_class`, `ts`,
`mcp_session_id`, `request_id`, plus `@timestamp`.

**Output:** ≤1000 rows inline under `rows`; larger results spill to a CSV
under `<output>/telemetry/` with `csv_path` + `preview`.

---

## Active users

DAU (rolling 24h):
```
query: stats count_distinct(User) as DAU
start: -PT24H
```

WAU (rolling 7d):
```
query: stats count_distinct(User) as WAU
start: -P7D
```

MAU (rolling 30d):
```
query: stats count_distinct(User) as MAU
start: -P30D
```

Active-users trend by UTC calendar day (note: `bin(1d)` aligns to UTC
midnight, and the first/last bin of the window are partial):
```
query: stats count_distinct(User) as DAU by bin(1d) | sort @timestamp asc
start: -P30D
```

> Caveat worth stating in any report: these counts are **CloudWatch-reported
> activity**, i.e. a lower bound. The EMF sink is fire-and-forget and fails
> silently, so an active user whose upload failed (expired creds, network)
> is not counted. Local JSONL on each machine is the only complete record.

## Usage breakdown

Invocations by tool:
```
query: stats count(*) as n by Tool | sort n desc
start: -P30D
```

Invocations by user:
```
query: stats count(*) as n by User | sort n desc
start: -P30D
```

Per-user, per-tool matrix:
```
query: stats count(*) as n by User, Tool | sort n desc
start: -P7D
```

## Raw data / prompt analysis

Most recent invocations with the user's prompt:
```
query: fields @timestamp, User, Tool, user_prompt | sort @timestamp desc | limit 50
start: -PT24H
```

What did a specific user ask:
```
query: fields @timestamp, Tool, user_prompt, params_json | filter User = "alice" | sort @timestamp desc | limit 100
start: -P7D
```

All prompts for one tool (e.g. what people search):
```
query: fields @timestamp, User, user_prompt | filter Tool = "search_api_knowledge" | sort @timestamp desc | limit 200
start: -P7D
```

## Errors & latency

Recent failures:
```
query: fields @timestamp, User, Tool, error, error_class, user_prompt | filter Success = "false" | sort @timestamp desc | limit 50
start: -P7D
```

Failure rate by tool:
```
query: stats count(*) as total, sum(Success = "false") as failures by Tool | sort failures desc
start: -P7D
```

p50 / p90 / p99 latency by tool:
```
query: stats pct(LatencyMs, 50) as p50, pct(LatencyMs, 90) as p90, pct(LatencyMs, 99) as p99 by Tool | sort p99 desc
start: -P7D
```

---

These are starting points — `query_telemetry` is an atomic primitive, so
extend with any Logs Insights query. See the
[Logs Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html).
