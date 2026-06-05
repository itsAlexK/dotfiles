# VAMOS Tool Pitfalls (non-obvious / silent-failure set)

**TL;DR — 3 pitfalls you cannot derive from the tool signature:**
1. GV at aggregate = silent 0 → use `rt_gv`
2. `variation` + date-grain dimension = reject → split TY + LY
3. `COMPANY_VENDOR_CODE` + volume metric = reject → use `REVENUE_SHARE_AMT` / `rt_order_*`

All 3 now caught pre-flight with actionable hints.


Updated 2026-04-25 with live-probe evidence. Every claim here is backed by
either a probe in `doc/rms-probe-results/gap*.md` or a fix-validation
entry in `doc/rms-fix-validation_2026-04-25.md`. The authoritative deep
reference is `doc/rms-api-reference.md`.

After the RMS MCP migration, there are 4 VAMOS tools (query_metrics,
query_metrics_ctc, query_benchmark, query_goal). This file lists the
"silent failure / surprising behaviour" set you cannot derive from the
tool signature.

## All VAMOS tools — JP defaults + latency budget

All tools default to JP (`marketplace_id=6`, `region_id=3`). Do NOT pass
these unless querying a different marketplace.

Expected tool-time budget per call (95th percentile, probed):

| Tool | Small (single scorecard) | Medium (10+ metric × group_by) | Large (group_by=ASIN, many rows) |
|---|---|---|---|
| `query_metrics` | 2-4 s | 4-8 s | 15-30 s |
| `query_metrics_ctc` | 5-15 s (WoW/QoQ/YoY) | up to 2+ min (MoMCtC) | n/a |
| `query_benchmark` | 3-6 s | 5-8 s | n/a |

If a call takes > 2× the upper band, something is wrong — check scope,
variation, or fall back to Route B.

## query_metrics (Bruno MCP Gateway → DoraemonAgentService → RMS)

### Prerequisites
- Live `mwinit` session. Bruno credentials auto-refresh on server load
  and self-heal on 401 — no manual `ada` step required.
- Metrics auto-routed Ripple vs VBMS on the RMS backend — no client-side
  routing needed. Accepts both enum names (`Revenue`, `NetPpm`) and IDs
  (`REVENUE_SHARE_AMT`, `NET_PPM`, `rt_order_ops`, `rt_gv`).

### Input quirks the tool handles for you

- `(metric, variation)` duplicates (e.g. `variation="YoY"` + `additional_variations="YoYPercent"`) dedupe silently — RMS would otherwise reject as duplicate.
- `asin=` mode auto-resolves vendor + GL — pass just ASINs.
- Multi-metric RMS 500 retries per-metric and merges.

### tp_type — legacy time-period granularity codes

The old VAMOS HTTP API used `tp_type` to control period granularity. The current Bruno `query_metrics` exposes this implicitly via `start_date` / `end_date` + `group_by=RecordMonth/Week/Day`, but the concepts still show up in wiki pages and production SQL.

| tp_type | Meaning | Current equivalent |
|---|---|---|
| `1DA` | 1 Day Aggregate (daily grain) | `group_by=RecordDay` over the desired range |
| `1WA` | 1 Week Aggregate (Amazon Reporting Week) | `group_by=RecordWeek` |
| `1MA` | 1 Month Aggregate (default on old API) | single call spanning one calendar month |
| `1QA` | 1 Quarter Aggregate | `group_by=RecordQuarter` |
| `MTD` / `QTD` / `YTD` / `WTD` | Month/Quarter/Year/Week-to-Date cumulative | Pass the truncated range yourself (e.g. `start_date=first-of-month`, `end_date=today`). Bruno has no native WTD/MTD mode. |
| `CUSTOM` | User-defined date range | Any `start_date` / `end_date`. ⚠️ **No built-in YoY / Goals / CTC** — for year-over-year, run TY and LY separately and compare client-side. |

**⚠️ 1MA across calendar-month boundaries** — the legacy API required `1MA` ranges to sit inside a single calendar month. Current Bruno does not have this restriction, but some production SQL templates still do. If you see "1MA violation" errors in forked SQL, split the range at month boundaries.

### CVR-family metrics — no longer blocked

`CONV_RATE_PCT`, `RETAIL_CONVERSION_RATE`, `rt_cvr`, `DAILY_SOROOS_PERCENTAGE`,
`rt_soroos_perc` all work at vendor / GL / category aggregate scope via
Bruno Gateway. The old CBOR NULL crash only affected the retired aim-mcp
Java Smithy path. Verified 2026-04-29 (AAJUK + GL121, all 5 metrics +
YoY variation).

### GV silent-zero

`GLANCE_VIEW_COUNT` and `RETAIL_BB_GV` return `0.0` with no error at
vendor / GL / category aggregate scope. At `asin=` scope or `group_by="ASIN"` they work.
**Workaround:** use `rt_gv` (VBMS retail-buyable) for vendor-aggregate GV.
Drift vs `GLANCE_VIEW_COUNT` at ASIN scope is <2% (probed
B0GR6PHDXZ/B0GGB7L18Z); aggregate drift not probed.

### Variation coverage (15/20 pass)

- ✅ All Difference / Percent / ComparisonBase for WoW/MoM/QoQ/YoY/PoP.
- ❌ All `*CtC` (WoWCtC/MoMCtC/QoQCtC/YoYCtC/PoPCtC) rejected by RMS
  `VendorMetricsQueryManager`.
- **`YoYCtC` is auto-handled client-side** when used in breakdown modes
  for absolute metrics (OPS/Units/GV/Revenue/CP/COOP/`rt_order_*_ops`):
  `query_metrics` runs 2 calls (TY+LY) and appends `[YoY Δ]` + `[YoY bps]`
  columns. Rate metrics (ASP/CVR/PPM/CPPU) still return a clear error —
  compute Rate+Mix client-side per WBR CTC formula.
- WoW needs weekly range; MoM needs single-month range; QoQ/PoP equivalent
  for quarter-length ranges.
- Variation + date-grain dimension (`RecordMonth`/`RecordWeek`/`RecordDay`)
  rejected. Split into TY + LY calls and join client-side.

### Softlines two-tier vendor pattern (TC32 Achilles)

For Softlines vendors, Goals and Actuals sit on different tiers:

- **Goal targets** → `COMPANY_VENDOR_CODE` (e.g. ACHL7 for Achilles) —
  call `query_metrics(vendor_code_type="COMPANY_VENDOR_CODE", …)`.
  Remember: `COMPANY_VENDOR_CODE` rejects volume metrics (OPS/Units/GV/ASP),
  use `REVENUE_SHARE_AMT` / `rt_order_*` instead.
- **Actuals by POD / brand** → `PARENT_MANUFACTURER_CODE` (e.g. SKEXP
  for SK-Sports = Achilles parent). Works with all volume metrics.

One query often needs both passes. See playbook
`softlines_two_tier_vendor` for the recipe.

### vendor_code_type — Smithy declares 6, runtime accepts 4

| Type | Accepted? | Restriction |
|---|---|---|
| `CHILD_MANUFACTURER_CODE` (default) | ✅ | all metrics |
| `PARENT_MANUFACTURER_CODE` | ✅ | all metrics |
| `COMPANY_VENDOR_CODE` | ✅ | **rejects volume metrics** (OPS/Units/GV/ASP). Use `REVENUE_SHARE_AMT` or `rt_order_*`. Needed for Softlines (e.g. ATINT). |
| `CHILD_VENDOR_CODE` | ✅ | same volume-metric restriction |
| `PARENT_VENDOR_CODE` | ❌ | `Unsupported vendor code type` |
| `COMPANY_MANUFACTURER_CODE` | ❌ | `Unsupported vendor code type` |

### goal_tracking granularity

OP2 / JBP goals are held at **GL / vendor scope**, not at Category or
Subcategory. Passing `categories=...` + `goal_tracking=OP2` returns
empty. If user asks "Category X vs OP2", the honest answer is the
category-level revenue vs the GL-level OP2 rollup — flag the scope
difference in the output.

### goal_tracking=JBP|OP2

Request shape is now correct (fixed 2026-04-25 — see
`doc/rms-fix-validation_2026-04-25.md`). For JP scopes the backend returns
`{"Goals":[]}` (no data loaded yet). Tool displays "_No JBP goals found_"
rather than crashing. **Treat as upstream data-coverage issue, not tool bug.**

### Dimensions and breakdown

- 73 dimension enum values; aliases: `Category`, `SubCategory`, `Brand` /
  `BrandName`, `Manufacturer`, `ASIN`, `POD` / `SL_POD`,
  `RecordMonth/Week/Day/Quarter/Year`. See
  `src/dataquest/tools/vamos/bruno/aliases.py::DIMENSION_ALIASES` for full map.
- `group_by='ASIN,RECORD_MONTH'` **works** with vendor scope. With
  `asin=<list>` scope, multi-dim is silently dropped (tool switches to
  single-dim ASIN path).
- `BROWSE_NODE_ID` breakdown via `group_by=BrowseNode` (or raw `browse_node_id`) **works on Route A** — returns OPS by node. No native filter, though: there's no `browse_nodes=` arg, and passing node IDs into `category_codes` / `sub_category_codes` silently returns 0 (different namespace). To scope to a specific node ID list, drop to Route B.
- `IS_B2B` returns only `N` for probed 1P vendors (AALUX, AAJUK) —
  B2B split not exposed at this scope.
- `order_by` by variation rejected: `Order by variation is not supported yet`.
  Sort client-side.

### Metric naming traps

- **`rt_net_ppm` does NOT exist.** VBMS has no Net PPM. Use Ripple
  `NET_PPM` instead (no rt_* equivalent).
- **`rt_revenue_share_amt`** can poison multi-metric calls (backend 500).
  The tool now auto-retries as single-metric calls. If the fallback also
  500s, drop to Route B SQL on `O_WBR_CP_FE`.
- **Profitability metrics** (`NET_PPM`, `CONTRIBUTION_MARGIN`, `PCOGS`)
  are best fetched via `query_benchmark`, not `query_metrics` — the
  former aligns to the canonical VAMOS Benchmark pipeline.

### Tool auto-hints (the tool fails fast with a readable error)

| Trigger | Tool behaviour |
|---|---|
| CVR / SoROOS at aggregate | ✅ Works directly via Bruno (no longer blocked) |
| `variation=` + RecordMonth/Week/Day | Reject pre-flight, advise TY+LY split |
| `COMPANY_VENDOR_CODE` + volume metrics | Reject pre-flight, advise `REVENUE_SHARE_AMT` |
| `tp_type` mismatches date range | Reject pre-flight, advise dropping `tp_type` |
| Multi-metric 500 from RMS backend | Silent fallback: per-metric retry + merge |
| GV returns 0 at aggregate | Hint appended: "use `rt_gv` for aggregate" |
| RMS ratio metric (CM / NetPPM) | Formatter renders as `12.00%` not `0.12` |
| `(metric, variation)` duplicates | Translator dedupes silently |

### Other semantic traps

Numeric differences between OPS/rt_order_ops, ASP/rt_order_aup, and the CVR family (CONV_RATE_PCT vs RETAIL_CONVERSION_RATE vs rt_cvr) are documented in the MCP server instructions. Those are metric-definition differences, not tool bugs.

- `tp_type` — **prefer to omit**. RMS auto-infers from the date range.
  Explicit `1QA` / `1MA` / `1WA` / `1YA` must match a full calendar
  quarter/month/week/year or the tool now rejects pre-flight with a
  clear "drop tp_type or align to ..." message. `1DA` / `CUSTOM` accept
  any range.
- `baseline_date` supported by translator but NOT exposed in the
  `query_metrics` tool signature today.

Scope discovery pattern (brand / category / subcategory enumeration for a vendor) lives in `advanced-recipes.md` §Scope discovery.
