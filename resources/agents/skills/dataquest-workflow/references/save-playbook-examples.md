# save_playbook Examples

`save_playbook` combines tip + recipe in one call. Fill in whichever parts apply.

## Key principle — generalize, don't hardcode

- **Tips** capture reusable knowledge — API limitations, data source rules, schema patterns — NOT specific vendor/GL values.
- **Recipes** describe the resolution **pattern** (tools, JOINs, decision points) — NOT hardcoded parameter values. A recipe should be replayable for any vendor/node/GL fitting the same pattern.

## Tip-only (reusable knowledge — API limitation, schema rule)

```python
save_playbook(
    tip_title="NET_PPM / CONTRIBUTION_MARGIN — use query_benchmark",
    tip_content="Profitability metrics (NET_PPM, CONTRIBUTION_MARGIN) are best fetched via query_benchmark which aligns to the canonical VAMOS Benchmark pipeline, not query_metrics.",
    tags=["vamos", "workaround"]
)
```

## Tip + Recipe (new pattern AND resolution)

```python
save_playbook(
    tip_title="Browse node OPS/GV requires Andi SQL",
    tip_content="query_metrics can't scope by browse node. Must JOIN o_asin_browse_node_assgmnts.",
    recipe_name="Browse node monthly OPS/GV with YoY",
    recipe_steps="1. ask_andi: JOIN pk-assignment-platform.o_asin_browse_node_assgmnts (browse_node_id=user's node) with BOOKER.D_DAILY_ASIN_ACTIVITY + GLANCE_VIEW_METRICS.D_DAILY_ASIN_GV_METRICS. Aggregate by month, include prior year for YoY.\n2. execute_sql: run SQL\n3. If timeout → store_query_result + query_local",
    recipe_present="- Monthly table: Month | OPS | OPS YoY% | GV | GV YoY%",
    tags=["browse_node", "OPS", "GV", "andi", "YoY"]
)
```

## Rules

- **Generalize** — save the pattern, not the instance. Don't hardcode vendor codes, GLs, or dates.
- Use `relative:xxx` tokens for time references (e.g. `relative:current_quarter`).
- Include enough detail in `recipe_present` for LLM to reproduce the output format.
- **One call** — never split tip and recipe into separate `save_playbook` calls for the same friction event.

## Anti-patterns (don't do this)

```python
# BAD — vendor-specific, date-specific, GL-specific
save_playbook(
    recipe_name="AAJUK Q1 2026 GL121 QBR",   # too narrow
    recipe_steps="1. Call query_metrics(vendor_code='AAJUK', gls='121', start_date='2026-01-01', ...)"
)

# GOOD — pattern level, date tokens, vendor placeholder
save_playbook(
    recipe_name="Vendor GL QBR — Topline + Bottomline + JBP/OP2 overlay",
    recipe_steps=(
        "1. Step 1.5 resolves vendor + GL.\n"
        "2. query_metrics with metrics=[OPS, Units, GV, CVR, ASP], scope=vendor+gl, "
        "date=relative:current_quarter, variation='YoYPercent', goal_tracking='OP2'.\n"
        "3. If goal section empty, note 'OP2 not populated for this scope'."
    ),
    tags=["qbr", "vendor", "gl"]
)
```
