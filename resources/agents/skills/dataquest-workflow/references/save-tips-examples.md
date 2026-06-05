# save_run tips Examples

ALL runs are auto-indexed into the per-project `runs` LanceDB table — tips
are no longer the gate for indexing. `save_run(... tips="...")` writes
`tips.md` into the run folder; when present, the tips get embedded alongside
`user_question` (boosts ranking and marks `has_tips=True`). When absent, the
run is still embedded via `user_question + summary[:800]` and discoverable
via search — just without the captured-lesson signal.

The run's actual tool sequence (the "recipe") is already captured in
`run.json` from the `manifest.tool_calls` you pass to `save_run`. The
`tips` text is the **narrative lesson** that complements the executable
record — what to remember next time, framed for retrieval.

## Key principle — generalize, don't hardcode

- **`tips.md`** captures reusable knowledge — API limitations, data source
  rules, schema patterns, cross-cutting invariants — NOT specific
  vendor/GL values.
- **`run.json` `tool_calls`** carry the resolved instance (this vendor, this
  date range). Replay via `@<folder-name>` reuses those args verbatim. So
  the tips narrative does NOT need to repeat them — point the reader at
  the relevant `tool_call` index instead.

## Tips-only example (reusable knowledge — API limitation)

```python
save_run(
    topic="Profitability metrics route to query_benchmark",
    summary_md="...the actual run summary...",
    manifest={
        "user_question": "Compare NET_PPM for vendor X vs peers in GL 121",
        "tool_calls": [
            {"tool": "query_benchmark", "args": {...}, "produced": "..."},
        ],
        "tags": ["profitability", "benchmark", "vamos"],
    },
    tips=(
        "Profitability metrics (NET_PPM, CONTRIBUTION_MARGIN, PCoGs, PPM) "
        "must use `query_benchmark`, not `query_metrics`. The Bruno Gateway "
        "doesn't surface them; only the VAMOS Negotiation API does. "
        "See tool_call 1 for the canonical arg shape (manufacturer + gl + "
        "peer_manufacturers).\n\n"
        "Probe queries this should fire on:\n"
        "- 'profitability comparison vendor peers'\n"
        "- 'NET_PPM 比較'\n"
        "- 'contribution margin benchmark'"
    ),
)
```

## Tips + executable run example (new pattern AND resolution)

```python
save_run(
    topic="Browse-node OPS/GV — requires Andi SQL Route B",
    summary_md="...",
    manifest={
        "user_question": "Monthly OPS and GV YoY for browse_node 12345",
        "tool_calls": [
            {"tool": "search_datanet_jobs", "args": {...}, "produced": "..."},
            {"tool": "get_datanet_job_sql", "args": {...}, "produced": "..."},
            {"tool": "execute_sql", "args": {"sql": "<JOIN ASIN→browse_node→activity>"}, "produced": "..."},
        ],
        "tags": ["browse_node", "OPS", "GV", "andi", "YoY", "route_b"],
    },
    tips=(
        "Browse-node BREAKDOWN does work on Route A — `query_metrics(group_by=BrowseNode)` "
        "returns OPS by `BROWSE_NODE_ID`. But there is no `browse_nodes=` filter on "
        "Bruno, so to SCOPE to a specific node-ID list you must drop to Route B and "
        "JOIN `pk-assignment-platform.O_ASIN_BROWSE_NODE_ASSGMNTS` with "
        "`BOOKER.D_DAILY_ASIN_ACTIVITY` (+ `GLANCE_VIEW_METRICS.D_DAILY_ASIN_GV_METRICS` "
        "for GV). Do NOT pass node IDs into `category_codes` / `sub_category_codes` — "
        "different namespace, silently returns 0.\n\n"
        "The full executable JOIN+filter set is in tool_call 3 — replay this "
        "run with `@<folder>` to reuse the exact SQL shape (1P filter + JP "
        "market IDs already encoded in WHERE).\n\n"
        "Probe queries this should fire on:\n"
        "- 'browse node monthly OPS'\n"
        "- 'browse_node GV YoY'\n"
        "- 'カテゴリツリー node-level 売上'"
    ),
)
```

## What the tips field is NOT for

- **Don't paste the SQL into `tips.md`.** The SQL is in `tool_calls[*].args`
  — replay copies it verbatim. Pasting it into prose doubles maintenance and
  invites drift.
- **Don't repeat the user's specific scope (vendor X, date Y, GL Z).** Those
  are in `tool_calls[*].args` and `manifest.user_question`. The tips
  narrative should generalise to the *next* user's analogous question.
- **Don't write a tips entry just because you ran `save_run`.** Leave `tips=""`
  (or omit it) when the run was a smooth successful query with no novel
  lesson. Empty-tips runs are fully indexed (via `user_question + summary`)
  and replayable via `@<folder>` — they show up in search with `has_tips=False`,
  marked as raw history rather than captured lessons. Tips are an optional
  quality boost, not the gate for retrieval.

## Rules

- **Generalize** — capture the pattern in `tips.md`, the instance in
  `tool_calls`. Cross-reference by `tool_call` index ("see tool_call 2 for
  the WBR-canonical schema swap").
- Use `relative:xxx` tokens for time references in tips prose
  (e.g. `relative:current_quarter`).
- Include enough detail in the run's `summary_md` for a future agent to
  judge whether the lesson applies before running replay.
- **One run, one tips.md** — never split one friction event across multiple
  `save_run` calls.

## Anti-patterns (don't do this)

```python
# BAD — vendor-specific tips, date-specific, GL-specific
save_run(
    topic="AAJUK Q1 2026 GL121 QBR",   # too narrow
    summary_md="...",
    manifest={"user_question": "...", "tool_calls": [...]},
    tips="When AAJUK asks for Q1 2026 GL121 QBR, run query_metrics with these args...",
)

# GOOD — pattern-level tips, instance lives in tool_calls
save_run(
    topic="Vendor GL QBR — Topline + Bottomline + JBP/OP2 overlay",
    summary_md="...",
    manifest={
        "user_question": "QBR for AAJUK GL121 Q1 2026",
        "tool_calls": [
            {"tool": "query_metrics",
             "args": {"vendor_code": "AAJUK", "gls": "121",
                      "metrics": ["OPS", "Units", "GV", "CVR", "ASP"],
                      "start_date": "2026-01-01", "end_date": "2026-03-31",
                      "variation": "YoYPercent"},
             "produced": "..."},
            {"tool": "query_goal", "args": {...}, "produced": "..."},
        ],
        "tags": ["qbr", "vendor", "gl"],
    },
    tips=(
        "Vendor + GL QBR: pull topline (OPS/Units/GV/CVR/ASP) via "
        "`query_metrics` with `variation=YoYPercent`, then overlay JBP/OP2 "
        "goals via `query_goal` for the same scope+window. If `query_goal` "
        "returns empty, note 'OP2 not populated for this scope' rather than "
        "treating it as zero. Tool_call 1 shows the canonical metric set; "
        "swap vendor_code / gls / dates per request."
    ),
)
```
