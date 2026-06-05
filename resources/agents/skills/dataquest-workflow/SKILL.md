---
name: dataquest-workflow
description: Complete workflow for querying Amazon data via DataQuest MCP tools. Covers VAMOS metrics (Ripple + VBMS) and Andi SQL routes. Use when user asks a data question.
version: 5.0.32
author: Elvis Lin
tags:
  - dataquest
  - workflow
  - data
  - sql
  - andi
  - vamos
  - ripple
  - vbms
projectScope: local
userInvocable: true
---

# DataQuest Data Query Workflow

**Preflight:** This workflow needs the DataQuest MCP tools (`query_metrics`,
`execute_sql`, …). If they're not in your current tools, STOP — tell the user
「DataQuest MCP 未啟用，請先啟用再查詢」, don't hand-write SQL or fake a query.

Two routes: **VAMOS Metrics** (`query_metrics` + `query_metrics_ctc` + siblings, fast API) and **Andi SQL** (custom queries). User language = response language (日本語 / 繁體中文 / English) — keep metric IDs + SQL in English regardless.

Domain: **1P Vendor (Retail)**. Trusted schemas: `BOOKER`, `JCI_BI`, `JP_HARDLINE_DDL`, `VIDEOADS_DDL`, `GLANCE_VIEW_METRICS`, `AIM_BI_DDL`. Flag `SELLER_ANALYTICS`/`SELLER_CENTRAL` (wrong domain).

## Always-on defaults (priors the user won't state)

- **JP market**: `region_id = 3`, `marketplace_id = 6`. Route A auto-sets; Route B SQL must include on every table that has these columns (they're partition keys — omitting causes full scans).
- **No date range given** → default to the last completed Amazon Reporting Week (Sun–Sat), then announce `"No date range specified — defaulting to last completed week (YYYY-MM-DD ~ YYYY-MM-DD)"`. When the user does give a week number without a year (e.g. "WK15"), resolve via `O_REPORTING_DAYS` — see Reference triggers below.
- **No scope given** (no vendor / GL / category / ASIN / brand) → ask the user; **do not run** the query.
- **New/Repeat customer lookback unspecified** → default rolling 12 months, then announce.

## API Rules

Shared Bruno constraints (1-vendor-per-request + vendor_code_type by PF + metric naming traps) are in the MCP server instructions — already in context. Tool-specific behavior (e.g. `query_metrics_ctc` scope trap) lives in each tool's docstring; consult the docstring before calling.

- **All Route A scope params are CSV strings, not arrays.** `metrics="A,B,C"`, `gls="229"`, `vendor_code="AADUR,AAJUK"` — passing a JSON array errors with `Input should be a valid string`.

Workflow-specific defaults:
- **`variation=""` by default.** Only set `YoY/MoM/QoQ` when the user explicitly compares periods — unnecessary variation calls are slower and harder to read.
- **CVR works directly at aggregate scope via Bruno.** Don't hand-roll ratio math for `CONV_RATE_PCT`, `RETAIL_CONVERSION_RATE`, `rt_cvr`, `DAILY_SOROOS_PERCENTAGE`, `rt_soroos_perc` — API returns correct values at vendor / GL / category aggregate.

## Reference triggers — load BEFORE acting

Progressive loading works only if the trigger fires. If ANY row below matches the question (or Route A returns an error), **read that reference before running the next tool**.

| If the question / situation involves... | MUST read first |
|---|---|
| Deal events (PD/BFW/MDE/FDE/HDE/CDE/初売り), event codes, `CUSTOM` tp_type | `references/jp-retail-dimensions.md` §Deal Events |
| WK number without a year (e.g. "WK15") or ambiguous reporting-week reference | `references/jp-retail-dimensions.md` §Amazon Reporting Week |
| WTD / MTD / QTD / YTD cumulative, or 1MA across calendar months | `references/tool-pitfalls.md` §tp_type |
| CtC formulas (Absolute vs Average vs Percentage metric) — any DuckDB rate/mix math | `references/ctc-calculation.md` |
| Route B (custom SQL): scope-to-specific browse-node-IDs, 七味/Shichimi, customer-level, `brand_code`, cohort | `references/route-b-andi-sql.md` — in full |
| Route B SQL on DUCOI / DUCSI / D_DAILY_ASIN_ACTIVITY / D_CUSTOMER_ORDER_ITEMS (any 1P order/shipment/daily table) — even if you think you remember the filter | `references/jp-retail-dimensions.md` §1P Retail Filter — full multi-clause set per table |
| Route A returned `{"error": ...}` with a hint you don't recognise | `references/tool-pitfalls.md` §Tool auto-hints |
| Ambiguous user intent ("how about we do X?") — no concrete metric/scope yet | ask the user; do not call tools |
| About to pass `tips=` to `save_run` but unsure of templates | `references/save-tips-examples.md` |
| Looking for advanced multi-step recipes (cohort, new/repeat, backfill) | `references/advanced-recipes.md` |

**Broken-trigger fail-loud rule.** If you follow a trigger and the referenced section is missing, too thin to act on, or contradicts what you need, **STOP and ask the user** — do not fill in with plausible guesses. A broken trigger is a skill bug; surfacing it is more useful than papering over it.

Silent-failure details + full auto-hint table live in `references/tool-pitfalls.md`. Live-probed metric reference: `doc/rms-api-reference.md`.

## Step 1: Knowledge Lookup + Date Resolution — MANDATORY

**Always run first — even for obvious queries.** Purpose: (1) recipe lookup (KB holds verified SQL + table paths); (2) metric API-name resolution; (3) routing hint. Skipping it is the #1 cause of wrong-schema retries.

- Call `search_api_knowledge` (vamos + runs + official_playbook) with `query` = simplified search terms (2–3 core nouns). `user_prompt` is analytics-only — pass through the original question for logging when you simplify `query`.
- Time references must be concrete `YYYY-MM-DD`. Infer from context (fiscal quarter, "先月", "Q1 2026") silently. Only confirm with the user if truly ambiguous.
- **Multi-concept queries — multipart parallel, short queries.** Issue 2–4 `search_api_knowledge` calls in the same tool batch, one per concept, each with 2–3 core nouns. Same ranker rules as `search_datanet_jobs` (docstring has full rubric): short queries win, filler tokens dilute. Example for "prefecture OPS by vendor": `"OPS metric ripple"` + `"prefecture dimension"` + `"vendor code manufacturer"`. NOT one long query.

**Recipe shortcut:** score ≥ 0.7 **and** non-empty `recipe_steps` → execute recipe directly, skip Steps 2+. Score 0.5–0.7 → use recipe as primary guide.

## Step 1.5: Resolve Dimensions & Scope

- **Vendor code type inference:** when the user just says "vendor", pick the type from PF context (Consumables/Hardlines/Media → default; Softlines → COMPANY_VENDOR_CODE). Full constraint matrix in server.py Shared Bruno constraints.
- **Brand:** `brand_names=` works for both internal and merchant names. `brand_code` (e.g. `LEEB1`) has no Route A support → Route B on `D_MP_ASIN_MANUFACTURER.brand_code`. Before giving up on a brand code, also try it as `brand_names=`.
- **Dimensions Route A can handle:** GL / Category / Subcategory / Manufacturer / Vendor / Brand Name / ASIN / POD / Browse Node (via alias map; `group_by=BrowseNode` returns OPS by `BROWSE_NODE_ID`). **Route B only:** scope-to-specific browse-node-IDs (no `browse_nodes=` filter on Bruno — passing node IDs to `category_codes` silently returns 0), 七味/Shichimi Custom Category, customer-level, `brand_code`.
- **Product hierarchy:** GL (2-3 digits) → Category (8 digits, prefix = GL) → Subcategory (8 digits, prefix = Category). Example: `121` → `12107000` → `12107010`.
- **1P filter:** Route A already filters. **Before writing ANY Route B SQL touching DUCOI / DUCSI / D_DAILY_ASIN_ACTIVITY / D_CUSTOMER_ORDER_ITEMS, read `references/jp-retail-dimensions.md` §1P Retail Filter IN FULL.** The filter is a **table-specific multi-clause set** (DUCOI: 8 clauses), NOT a single `is_retail_order_item='Y'`. Partial filter still mixes 3P and skews 5-30% vs Bruno — do not rely on memory, read the reference every time.

## Step 2: Build Query Plan

Read KB results' `metadata` fields — they contain `metric_id` and `data_source`. **KB is the single source of truth for metric API names.** Prefer Ripple (uppercase) over VBMS (`rt_*`) unless user needs a VBMS-only concept (Deal OPS, AB OPS, customer-level, CTO tree).

### Route decision

Full route-decision table (Route A vs B triggers, Route A sub-tool selection) is in the MCP server instructions — already in context. If Route B is needed, jump to the handoff below; otherwise proceed with the appropriate Route A tool.

### Route A tool-specific gotchas

- `query_metrics` handles scorecard (default), `group_by=`, and variations (`WoW/MoM/QoQ/YoY`). Bruno auto-picks `Percent` vs `Difference` based on whether the metric is a ratio.
- `query_metrics_ctc`: required params include `variation` (one of WoWCtC / MoMCtC / QoQCtC / YoYCtC). Scope-trap warning + canonical `gls=X, group_by=Manufacturer` pattern are in the tool docstring. **If you find yourself hand-rolling rate/mix in DuckDB instead of trusting the API, read `references/ctc-calculation.md` first** — formula differs per metric type (Absolute / Average / Percentage); mismatch produces wrong split silently.
- **Metric names when unsure:** copy `metric_id` from `search_api_knowledge` `metadata` — KB is the single source of truth. (Alias vs enum acceptance is documented in server.py instructions + each tool's docstring.)
- **Scope discovery** (brands / categories / subcategories for a vendor): no dedicated tool — use the `group_by` pattern from `advanced-recipes.md` §Scope discovery.
- **Route A error** → read the hint; don't retry the same shape. Common: `rt_gv` for aggregate GV, TY+LY split for date-grain variations, `REVENUE_SHARE_AMT` for Softlines volume. Auth errors → `references/tool-pitfalls.md` §Prerequisites.

### Route B handoff

**⚠️ MANDATORY when Route B applies.** `references/route-b-andi-sql.md` is the SOP — **read in full** before drafting any SQL. It covers: Step 3 decision tree (score thresholds), Step 4 knowledge trace (Datanet search + fetch), Step 5 split strategy (billion-row facts, 6-month windows), Step 6 fast-path SQL generation, Step 7 show-SQL + confirm gate.

**Standalone STOP gate (independent of reading in full):** if you find yourself about to call `execute_sql` on Route B without having shown the full SQL and received user confirmation, **STOP** — you skipped Step 7.

### Output format

Output the plan, then **execute immediately (NO user confirmation for Route A)**:

```
## Query Plan
- OPS → TOTAL_ORDERED_PROD_SALES_AMT (ripple) → query_metrics
- Scope: vendor_code=AAJUK, gls=121
- Date: 2026-03-01 ~ 2026-03-31
- Variation: YoY
```

## Presenting Results

- **CtC Top N — sort by value, not absolute value.** For `query_metrics_ctc` "Top N 貢獻最大 / contribution" questions, sort CtC descending and take positive Top N (push-up side). Never rank by `|CtC|` — mixing positive and negative rows hides the direction that makes CtC meaningful. Flip to ascending (bottom N) only when user explicitly asks for "拖累 / negative contributors / pull-down".
- **Table only** — markdown table, ≤8 columns (pivot if wider; CSV keeps original shape)
- **One-liner summary** — single sentence, top finding
- **Timing line** — `⏱ tool 4.2s → tool 8.5s | Tool time: Xs`
- **Chat vs CSV** — chat may show subset; CSV must contain **every row the API returned**. Tell user when chat is a subset.
- **Order**: stream the summary (incl. knowledge-sources section) to the user FIRST, THEN call `save_run`. The `reminder` field returned by `save_run` (friction check / citation reminder) is **post-summary housekeeping** — never block the user's summary on it.

## Knowledge sources citation

When the run used any knowledge-trace tool (`search_api_knowledge`, `search_sql_knowledge`, `search_datanet_jobs`, `get_datanet_job_sql`, `recall_recipes`), append a Knowledge Sources section at the end of the user-facing reply. The citation reminder appears in `save_run`'s `reminder` field when applicable — but write the section into the summary itself BEFORE calling `save_run`, so the user sees it without delay.

Format — one bullet per source actually used, grouped by type. Skip empty groups. One line per bullet: **source name — why it was useful** (what it confirmed / what you copied from it). Do not dump every hit; list only the ones that shaped the answer.

```
## Knowledge Sources
- **VAMOS 指標定義**
  - `TOTAL_ORDERED_PROD_SALES_AMT` (ripple) — 確認 OPS API 名稱與 data_source
- **Wiki / RISE 文件**
  - `jp-retail-dimensions.md §1P Retail Filter` — 套用 DUCOI Run-1P 完整 filter set
- **Datanet production job**
  - `job-12345 SQL_LOAD` — fork 此 job 的 billion-row split 策略
- **Past runs / Official playbook**
  - `vendor-to-gl-mapping` recipe — 套用既有映射流程
```

Skip this section when `summary_md` already has an equivalent knowledge-sources heading (any language) — avoid duplication; the reminder won't fire in that case either.

## browse_runs — when the user asks about past runs

When the user asks "我之前有沒有跑過 X / show me runs about Y / 找一下那個 Z 的 query"、call `browse_runs(query="...")`. The response style depends on the result count:

- **0 hits** → say so, suggest reformulating with different keywords or running fresh.
- **1–4 hits** → **show the results inline immediately** — list run_id + user_question + summary_snippet + has_tips for each. Do NOT ask "要打開 summary.md 嗎？" first; the snippet is already enough context for the user to pick. If the user wants more, they will ask. Each run already has `summary_snippet` (3 lines, 200 chars) — that IS the preview.
- **5+ hits** → show top 3–5 inline as a compact table, then offer "還有 N 筆，要看哪一筆 / 要不要縮小範圍？".

When `has_tips=True`, mention "(有 tips)" or 🌟 next to that run — it signals captured lessons worth prioritizing if the user is forking. Don't expand tips inline unless the user asks.

`browse_runs` itself doesn't trigger `save_run` — it's read-only retrieval. Only call `save_run` if the user then runs a fresh query off the back of what you found.

## Ending a successful query — MANDATORY save_run gate

**After streaming the summary to the user, call `save_run`.** Applies to every successful data-returning query — Route A (`query_metrics`, `query_metrics_ctc`, `query_benchmark`, `query_goal`) and Route B (`execute_sql`, `query_local`).

`save_run` returns a `reminder` field — friction check + citation reminders are consolidated there. Process those AFTER the user has the summary; do not delay the summary on them.

Required (top-level args): `topic` (slug str), `summary_md` (full markdown), `manifest` (object).
Optional (top-level args): `tables` (dict[name → csv content]), `tips` (str).
Inside `manifest`: required `user_question` (str), `tool_calls` (list of `{tool, args}`; `produced` field per call is optional). Optional: `tags`, `andi_session_id`.

Skip only when: the query errored, or returned zero rows.

## Friction save gate — post-summary housekeeping

**Order matters**: (1) stream the summary + knowledge-sources section to the user FIRST, (2) call `save_run`, (3) THEN run the friction check below. Do NOT block the user's summary on friction — it is post-summary housekeeping. False positives cost one row; false negatives compound across sessions.

**Procedure (run after `save_run`):**

1. **Score every trigger below.** For each line, mark `hit` or `no-hit` explicitly — do not skim. State which trigger(s) fired (one short phrase each).
2. **If ANY trigger is `hit` → you MUST capture the lesson before ending the turn.** Two ways to do this:
   - **Best (capture upfront):** include the lesson in the `tips=` arg when you call `save_run` for this query. Single call, atomic.
   - **After the fact:** if `save_run` was already called without tips, edit `runs/<folder>/tips.md` directly — the next session's reconcile re-indexes automatically. (Calling `save_run` again would create a NEW timestamped folder, not update the existing one; don't go that way.)

   The tips become embedded alongside `user_question` in the per-project `runs` index — they boost ranking on future similar queries via `search_api_knowledge` / `recall_recipes` / `browse_runs`, and the row's `has_tips=True` flag marks it as a captured lesson worth prioritizing.
3. **If ALL triggers are `no-hit` → end the turn.** No tips needed; the run is already indexed via `user_question + summary` and discoverable from all three search tools (just with `has_tips=False` — raw history rather than annotated lesson).

**Friction triggers:**

- [ ] Tool/API rejected a combo you thought would work (ValidationException, silent empty result, timeout forcing retry)
- [ ] Data-layer quirk needing non-obvious upstream workaround (text escape, type cast, null handling)
- [ ] Schema reality contradicted KB / skill / docstring (column absent, wrong case, wrong provider)
- [ ] New term/abbreviation the user used that was not in KB
- [ ] Mapping derived on the fly (vendor ↔ GL, dimension ↔ code table) that you had to discover
- [ ] Retry-to-correct-result (first call shape failed, second shape worked) — even if obvious in hindsight
- [ ] Hand-crafted a multi-step plan with no existing recipe surfacing in Step 1

**Before populating `tips`**, read `references/save-tips-strategy.md` — the retrievability + prevention rules are load-bearing. In particular, pre-draft 3 probe queries (same-language paraphrase / cross-language task intent / domain concept) and verify with `search_api_knowledge` after saving. If a probe fails, edit `runs/<folder>/tips.md` directly and re-probe (the next session's reconcile re-indexes automatically based on the file's mtime). Loop until all 3 pass.

For tips format and anti-patterns, see `references/save-tips-examples.md`.

**If a friction recurs** despite an existing entry: that is a retrievability or prevention failure in the existing entry — edit the existing run's `tips.md` to strengthen tokens or bake the fix deeper. Don't create a new run just to re-state the same lesson; the prevention is more reliable when it lives in the original run's `run.json` (the past `tool_calls` args ARE the fix template). To delete a stale entry entirely, remove the run folder; the LanceDB row is cleaned up on next reconcile.

## Advanced recipes

Multi-step patterns (cohort, new/repeat, backfill, split-and-merge) live in `references/advanced-recipes.md`. **Read it when** the question involves a pattern the route decision and the playbook search don't directly answer — before hand-crafting a novel multi-step plan.
