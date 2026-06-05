# Route B — Andi SQL

> **PREREQUISITE CHECK.** This file assumes Step 1 (`search_api_knowledge`) was already executed in the main skill. If you jumped here without Step 1 results, **STOP and go back to `SKILL.md` Step 1** — official playbook has verified SQL recipes with correct table paths and gotchas that prevent wrong-schema failures.

> **SELF-CHECK before proceeding.** Answer these six questions — if any is "no", you are about to skip a step:
> 1. Have I called **`search_datanet_jobs(query)`** and received results? → If no, do Step 4 Wave 2 first.
> 2. For any promising match, have I fetched the **full SQL body** via `get_datanet_job_sql(profile_id)`? Search returns metadata only — the fetch is mandatory. → If no, do Step 4 Wave 2b first.
> 3. Have I **shown the user** a Knowledge Trace Summary (KB scores, verbatim production SQL snippets, decisions derived from trace) **before** writing the Query Plan? → If no, do Step 4 "Surface findings" first. **Do NOT silently fold trace results into your SQL — the user must see what you found and what you decided.**
> 4. Am I about to hand-write SQL by forking the Datanet template? → **STOP**. Datanet SQL is Redshift-native; its column names may not exist on Andes. Call `ask_andi(pinned_tables="<SCHEMA>.<TABLE>,...", key_findings=<filter set>)` instead — Andi pulls the real Andes column list from the catalog. Hand-writing is allowed only when Step 1 returned a playbook recipe with score ≥ 0.75.
> 5. Have I written a Query Plan with the Split Verification checklist filled in AND the **1P filter check** — full Run-1P set per table, see `references/jp-retail-dimensions.md` §1P Retail Filter (NOT just one clause)? → If no, do Step 5 first.
> 6. Have I shown the user the full SQL in a ```sql block and received explicit confirmation to execute? → If no, do Step 7 first. **Never call `execute_sql` before this.**

Entered when Step 2 cannot resolve all metrics to VAMOS API names, or query needs custom JOINs / full row-level data.

**JP Market default:** All Route B queries target JP unless stated otherwise. Always include `region_id = 3` and `marketplace_id = 6` on every table that has these columns (DUCOI, DPI, D_DAILY_ASIN_ACTIVITY, D_MP_ASINS, O_ASIN_BROWSE_NODE_ASSGMNTS, etc.). These are partition keys on most tables — omitting them causes full scans and timeouts.

**Date partition keys:** `order_day` / `activity_day` / `snapshot_day` are the primary time partition on billion-row facts. ALWAYS add a bounded `BETWEEN` on these columns, even if the business logic is "all time" — substitute a concrete upper bound (current date) and a lower bound matched to the question. No lower bound = full-history scan = guaranteed timeout.

## Step 3: Decision Tree

Evaluate Step 1 `search_api_knowledge` results using **score + structural checks** (not score alone). If you have no Step 1 results, STOP — go back to Step 1 in the main skill.

| Check | Action |
|-------|--------|
| Score ≥ 0.75, result content has adaptable SQL or clear table/column names | Adapt directly. Skip all search. → Step 5 |
| 0.50–0.75, Step 1 found tables for **all** query concepts | Wave 2a (`search_datanet_jobs`) → Wave 2b (`get_datanet_job_sql`) to confirm columns. Skip `search_sql_knowledge` + InternalSearch. → Step 5 |
| 0.50–0.75, some concepts still **missing** table names | Step 4 (`search_sql_knowledge` + InternalSearch fallback). |
| < 0.50 | Full knowledge trace (Step 4 Waves 1+2+3). |

**Score integrity rule:** Score is the number only. Do NOT downgrade because the route doesn't match. Wrong-route results still provide useful context (table names, definitions).

**"All concepts covered" check:** Each data dimension needing a different schema/table counts as one concept. If Step 1 returned table names for every concept → covered. Example: GV + unique customers → need a GV table + an order/customer table. Both found → covered.

## Step 4: Knowledge Trace

**Wave 1 (parallel):**
- `search_sql_knowledge` — returns **source-grouped** JSON: `{wiki: [...top 4], rise: [...top 5]}`. Read each group separately; scores ARE NOT comparable across groups (per-source independent ranking).
  - `wiki` group — local wiki chunks (~12K from 1K pages). Use for table semantics, column definitions, business rules, domain glossary.
  - `rise` group — RISEKnowledgeAnnotations (~200 records). Curated metric formula + source tables for JP Retail gold layer (azabudai/booker/contribution_ddl).
- `InternalSearch` — external wiki **fallback** only for pages not covered by local wiki.
- `InternalCodeSearch` — column/table names only, never NL: `deal_ops vpc_ops fp:*.sql`

**Gold layer priority:** If `rise` results contain a hit whose source table is `azabudai.*` or `booker.*`, prefer that path — gold layer is pre-aggregated, fast (~5s), and schema-stable. Only fall back to raw provider tables (from `wiki` or Datanet SQL) when the metric is NOT available in azabudai/booker. This is a routing decision, not a score boost — when gold has what you need, use it directly with `get_andes_schema` to confirm columns, then compose SQL.

**Wave 2 — MANDATORY. Two steps, in order:**

**Wave 2a — Find similar production job:** `search_datanet_jobs`. Calling convention (multipart-parallel, 2–3 core nouns, filler tokens to avoid) is in the tool docstring — follow it.

**Picking candidates:** scan returned `job_name` + `owner` + `group`. GL number / team / marketplace in the name are strong signals. Pick 1–3 candidates across all parallel queries, de-duplicate by `profile_id`, then fetch SQL for each via `get_datanet_job_sql`.

**Wave 2b — Fetch full SQL template (required for business context, parallel fetch):**
- `get_datanet_job_sql(profile_id, profile_type)` — returns the **complete** SQL body for one job profile. Pass `profile_id` + optionally `profile_type` from the Wave 2a result. Search returns metadata only — the SQL fetch is mandatory.
- **Fetch 2–3 top candidates in parallel** (one `get_datanet_job_sql` per candidate in the same tool batch). Each call is ~1s; parallel fetch lets you compare filter sets / JOIN shapes across templates before picking the best fork. Don't serialise these.
- **Use this output for filter set + JOIN shape + candidate table names ONLY.** Datanet SQL is Redshift-native — column names may not exist on Andes (e.g. Datanet's `customer_order_id` vs Andes's `order_id`). Do NOT fork the SQL body into Andes verbatim.
  - Copy the `WHERE` clause filter set as **business context** to pass into `ask_andi(key_findings=...)`. Partition filters, 1P filters (full Run-1P set — see `references/jp-retail-dimensions.md` §1P Retail Filter), tombstone flags, condition codes — production jobs encode years of "the hard way" learnings.
  - Harvest the table names (`<schema>.<table>` refs in `FROM` / `JOIN`) to pass into `ask_andi(pinned_tables=...)`. Andi resolves the ARN and pulls the authoritative Andes column list from the catalog.
  - Prefer canonical schemas surfaced by production jobs. For 1P retail analysis, `intl_fin_ddl.d_mp_asin_wbr_classifications` is the WBR-canonical source (single table with `subcategory_code` + `manufacturer_code` + `manufacturer_name`) — preferred over joining `booker.d_mp_asins_essentials` + `booker.d_mp_asin_manufacturer` manually.

**Surface findings verbatim.** Before Step 5, quote the 3-5 SQL lines that changed your draft (e.g. "production uses `manufacturer_code` not `owning_vendor_code`", "WBR canonical uses `intl_fin_ddl.d_mp_asin_wbr_classifications` not dual BOOKER JOIN"), so the user can sanity-check your assumptions. Don't silently fold the fixes in.

### Table naming: Datanet FROM → Andes path

Datanet jobs run in Redshift with a different schema namespace from Andes. A Datanet template's `FROM <schema>.<table>` often won't resolve verbatim on Andes. Harvest the table names and normalise before verifying with `get_andes_schema`:

| Datanet `FROM` pattern       | What to pass to `get_andes_schema(provider, table)` |
|------------------------------|------------------------------------------------------|
| `<SCHEMA>.<TABLE>`           | `provider=SCHEMA, table=TABLE` (tool case-normalises) |
| `andes_ext.<S>.<T>`          | `provider=S, table=T` (drop the `andes_ext.` prefix — Redshift-only namespace) |
| `andes_bi.<S>.<T>`           | `provider=S, table=T` (drop the `andes_bi.` prefix) |
| `public.<T>`                 | **Skip** — Datanet-local table, no Andes equivalent. Find an alternative lookup via an upstream LOAD job. |
| Temp / `CREATE TEMP`         | Skip — rewrite as a CTE in your SQL |

If `get_andes_schema` returns `NOT_FOUND`, that table doesn't exist on Andes under any case. Search for a substitute (Wave 2a again with the table name as a query, or `search_sql_knowledge`).

Andi only needs manual pinning in the Step 6 fallback path — don't pre-build `pinned_tables` here.

**Wave 3 (conditional — run only if Waves 1+2 surfaced new technical terms):**
- If Waves 1+2 gave you table names / business concepts / SQL pattern hints that were NOT in the original user query, call `recall_recipes` with those new terms. This catches SQL recipes (past runs + canonical official_playbook) the original Round 1 phrasing would have missed (e.g. user asked "新客 OPS", Wave 1 revealed "first-purchase cohort" / "NOT EXISTS DUCOI lookback" — re-query with those terms).
- Skip Wave 3 if no new terms emerged.
- Rationale: Andi timeout cost (~60s) dwarfs one extra KB lookup (~0.3s).

**Reachability:** On Andes → proceed. Datanet-only → STOP, tell user. Permission denied → tell user which table needs access.

## Step 5: Build Query Plan (NO user confirmation — proceed directly to Step 6)

1. **List data concepts** — each metric/dimension needing a different table
2. **Map to tables** — from knowledge trace results
3. **Check reachability** — all tables on Andes? Datanet-only → STOP and tell user
4. **Predict execution strategy** — check for timeout risk:

    | Pattern | Risk | Strategy |
    |---------|------|----------|
    | Single table or same-schema JOIN, narrow date (≤ 1 month), no full-history scan | Low | One SQL → one `execute_sql` |
    | JOINs 2+ tables from **different schemas** (e.g. `BOOKER` + `GLANCE_VIEW_METRICS`) | High | Split: one SQL per schema, merge with `query_local` |
    | CTE (ASIN/node list) + large daily table + date range ≥ 12 months | High | Split by metric, each gets own CTE + table |
    | 3+ JOINs where 2+ are billion-row daily tables | High | Materialize intermediates via `store_query_result` |
    | Any billion-row daily table scanned **2+ times** in same query (cohort CTE + main SELECT, NOT EXISTS subquery, self-JOIN, UNION of different date ranges) where **both scans cover ≥ 1 month** or cohort size is unknown | High | **Always split**: one `execute_sql` per independent scan, then `store_query_result` → `query_local` to JOIN/filter |
    | Billion-row daily table scanned twice but **one side is a narrow seed list (≤ 2 ASINs, ≤ 1 month window, expected cohort ≤ 10k customers)** | Low | Single CTE query works — the narrow side keeps the plan sane. Only fall back to split on actual timeout. |
    | **ASIN / customer IN-list > 500 items** (e.g. "all 2,176 ASINs of vendor X") | High | Do NOT serialise the list into `WHERE … IN (…)`. Replace the literal list with a JOIN on the upstream attribute table (`D_MP_ASIN_MANUFACTURER`, `D_MP_ASIN_BRAND_MANUFACTURER`) and filter by `manufacturer_code=` / `brand_code=` instead. Saves SQL text size, lets Andes use table statistics. |
    | New customer / first-purchase = buyers in period X WHERE NOT EXISTS(buyers in lookback Y) | High | **Always split**: Q_period = buyers in X, Q_lookback = buyers in Y (if lookback > 6M, split into 6M chunks). `query_local`: Q_period WHERE customer_id NOT IN Q_lookback |
    | `MIN(order_day)` / first-purchase with **no lower bound** on order_day (full history scan) | High | **Always split**: run as single `execute_sql` with HAVING filter, `store_query_result` → `query_local` |
    | Lookback window > 6 months on DUCOI/DDAA (billion-row daily tables) | High | Chunk into consecutive ≤ 6-month windows (e.g. `2024-05-04~2024-11-03` + `2024-11-04~2025-05-10`), run in parallel, UNION in DuckDB |

    **CRITICAL: If ANY row matches "High", you MUST use the split strategy from the start. Do NOT attempt the combined query first — it WILL timeout.**

5. **Output the plan**:

```
## Query Plan
- Concept 1: monthly OPS by ASIN → BOOKER.D_DAILY_ASIN_ACTIVITY (gl_product_group, ordered_units)
- Concept 2: daily GV by ASIN → GLANCE_VIEW_METRICS.D_DAILY_ASIN_GV_METRICS (glance_views)
- Strategy: split (different schemas) → 2× execute_sql → store_query_result → query_local JOIN
- Date: 2025-01 ~ 2025-12, JP: region_id=3, marketplace_id=6
```

## Step 5→6 Gate: Split Verification (MANDATORY)

Fill this checklist in the plan output before Step 6. If any box fails, revise the plan.

- [ ] **Table scan count** — billion-row daily tables appearing ≥2 times are on the split list (unless one side is a narrow seed per the Low-risk rule above).
- [ ] **Separate `execute_sql` per scan** — each independent scan has its own SQL + call.
- [ ] **Lookback chunking** — any lookback > 6 months is split into ≤6-month segments.
- [ ] **Cohort push-down** — if the cohort size is small-to-medium (≤ 50k customers) AND the aggregate step is also in Andes, embed the cohort as an **Andes-side subquery** (`WITH cohort AS (...)` or `IN (SELECT ...)`) rather than pulling IDs to DuckDB. Export-then-JOIN only when cohort > ~200k rows (CSV round-trip cost exceeds a second scan).
- [ ] **1P retail filter** — every DUCOI / DUCSI / DDAA / D_CUSTOMER_ORDER_ITEMS query has the **full Run-1P set per its table** from `references/jp-retail-dimensions.md` §1P Retail Filter. A single clause (e.g. only `is_retail_order_item='Y'`) is NOT enough — DUCOI needs 8 clauses total. Omitting any silently mixes 3P / cancelled / zero-qty / damaged orders — typical drift 1-5% on counts, 3-6pt on YoY. This is the #1 cause of "numbers nearly match but YoY direction is wrong" bugs. **Before ticking this box, open the reference and compare clause-by-clause.**
- [ ] **Canonical schema preferred** — for WBR-style 1P retail analysis (subcategory × manufacturer × brand), use `intl_fin_ddl.d_mp_asin_wbr_classifications` as single source. Only fall back to `booker.d_mp_asins_essentials` + `booker.d_mp_asin_manufacturer` JOIN when you need essentials columns (`street_day`, `msrp`, etc.) that WBR doesn't carry.

## NTB / NTA definition alignment

VBMS's `rt_order_new_to_vendor_cust_ids` = New-To-Vendor in last 12 months.
When replicating in SQL:

- **NTV / NTB** (New To Vendor / Brand) = buyers in period P **AND**
  `NOT EXISTS` a row in [P - 12mo, P) for same vendor.
- **NTA** (New To ASIN) = `MIN(order_day) per (customer, asin)` falls
  within period P (lifetime lookback).
- **NTC** (New To Category) = buyer of category in P AND not in
  [P - 12mo, P) for the same category.

Chunk the 12-month lookback into 2 × 6-month ≤ 6M scans when needed.

## Typical SQL shapes (reference — for sanity-checking Andi output, not for copying)

Most Route B queries return one of three shapes from Andi. Use these to sanity-check that the SQL Andi returns is structurally right before you run it. **Do not copy-paste** — column names here may be out of date; always trust Andi's fresh output.

> **1P filter lines in these samples are abbreviated for readability.** The real query MUST include the full Run-1P set per table (8 clauses for DUCOI; `is_retail_merchant='Y'` for DDAA; etc.). Always read `references/jp-retail-dimensions.md` §1P Retail Filter before writing the WHERE clause — these samples alone are NOT a complete filter spec.

```sql
-- Shape 1: Daily / weekly aggregate on billion-row fact
SELECT TO_CHAR(activity_day, 'YYYY-MM') AS month, asin,
       SUM(net_ordered_product_sales) AS ops,
       SUM(net_ordered_units) AS units
FROM andes."BOOKER"."D_DAILY_ASIN_ACTIVITY"
WHERE region_id = 3 AND marketplace_id = 6
  AND activity_day BETWEEN DATE '2026-01-01' AND DATE '2026-03-31'
  AND is_retail_merchant = 'Y'
  AND asin IN (...)
GROUP BY 1, 2
ORDER BY 1, 2;

-- Shape 2: Customer cohort (single scan, small seed)
WITH cohort AS (
  SELECT DISTINCT customer_id
  FROM andes.BOOKER.D_UNIFIED_CUSTOMER_ORDER_ITEMS
  WHERE region_id = 3 AND marketplace_id = 6
    AND order_day BETWEEN DATE :start AND DATE :end
    AND asin IN (:seed_asins)
    AND merchant_customer_id IN (-1, 12, 720424855, 869744424, 8716442355)
)
SELECT asin, COUNT(DISTINCT customer_id) AS buyers, SUM(our_price * quantity) AS ops
FROM andes.BOOKER.D_UNIFIED_CUSTOMER_ORDER_ITEMS d
  INNER JOIN cohort c USING (customer_id)
WHERE d.region_id = 3 AND d.marketplace_id = 6
  AND d.order_day BETWEEN DATE :target_start AND DATE :target_end
  AND d.merchant_customer_id IN (-1, 12, 720424855, 869744424, 8716442355)
GROUP BY 1
ORDER BY ops DESC LIMIT 20;

-- Shape 3: Browse Node scope
SELECT b.browse_node_id, TO_CHAR(a.activity_day, 'YYYY-MM') AS month,
       SUM(a.net_ordered_product_sales) AS ops
FROM andes."pk-assignment-platform"."O_ASIN_BROWSE_NODE_ASSGMNTS" b
  INNER JOIN andes.BOOKER.D_DAILY_ASIN_ACTIVITY a USING (asin)
WHERE b.region_id = 3 AND b.marketplace_id = 6
  AND a.region_id = 3 AND a.marketplace_id = 6 AND a.is_retail_merchant = 'Y'
  AND b.browse_node_id IN (:nodes)
  AND a.activity_day BETWEEN DATE :start AND DATE :end
GROUP BY 1, 2;
```

## Step 6: Generate SQL (immediately after Step 5 — do NOT wait for user confirmation)

### DEFAULT: Fast path — `get_andes_schema` + hand-write SQL (NO Andi)

**This is the default for every Route B query.** Andi has a 60–90s cold start and adds no value when you already have a production template + DataCentral column authority.

**You MUST take the fast path unless a fallback condition below is true.** Catching yourself about to call `ask_andi` in Step 6 → **STOP**, you are almost certainly wasting 60–90s.

**Steps (mandatory, in order):**

1. Harvest table list from the production template fetched in Wave 2b (`get_datanet_job_sql` output). Remap any `<PROV>.<TABLE>` refs — drop `andes_ext.` / `andes_bi.` / `public.` prefixes; Redshift-native schemas like `jp_ana_ddl` may not exist on Andes and need a swap (e.g. `jp_ana_ddl.jp_geo` → `JP_LOCAL_ISM_DDL.POSTALCD_AREA_PREF_MAP`, usable via the postal-code 2-digit mapping pattern).
2. Call `get_andes_schema(provider, table)` **in parallel for every table** in a single tool batch (2–4 calls, ~1s each; `version=""` for latest). Do NOT serialise these.
3. For each table, scan the returned `columns` list and confirm:
   - JOIN key columns exist (e.g. `address_id`, `asin`, `marketplace_id`).
   - Filter columns exist (`is_retail_order_item`, `is_tombstoned`, `order_item_level_condition`, `manufacturer_code`, `is_deleted`, etc.).
   - Metric columns exist (`our_price`, `quantity`, `order_id`).
   - Any Redshift-only columns from the Datanet SQL (e.g. `customer_order_id`) are absent and you have the Andes equivalent (`order_id`).
4. Hand-write the SQL. Copy the Datanet template's filter set and JOIN ON clauses verbatim; substitute only the columns / schema paths that `get_andes_schema` proved need remapping. Use `"andes"."SCHEMA"."TABLE"` quoted form.
5. Go directly to Step 7 (show SQL + confirm). **Do not call `ask_andi`.**

**Why this default works:** DataCentral returns the same Andes catalog that Andi's Bedrock KB indexes from → column authority is identical and fresher (no RAG freshness delay). The Datanet production template gives JOIN shape + filter set. Skill's `references/jp-retail-dimensions.md` + playbook supply business rules (1P filters, JP market IDs). Andi adds nothing on top.

### FALLBACK: Andi path — `ask_andi(pinned_tables=...)` (use only for 3 narrow cases)

Drop to Andi **only** when one of these is true:

- **No production template at all.** `search_datanet_jobs` returned 0 useful hits after 2–4 multipart queries, so you can't read JOIN keys from a template. If Wave 2b returned at least one SQL body with legible `JOIN ON` clauses, this condition is NOT met — go fast path.
- **Ambiguous business metric.** User asks for Net PPM, NTV 12-month lookback, CtC mix/rate split, Deal OPS vs raw — these have curated formulas in Andi's README enrichment that aren't in the column-level catalog.
- **`has_rich_metadata=false` on all critical tables AND** the query needs semantic knowledge that columns alone don't convey (e.g. which `*_amt` column is net vs gross).

If none of the three applies → go back to the fast path.

**Call shape (for the fallback case):**

```
ask_andi(
    query="<natural language question with date + scope>",
    trace_status="found",
    pinned_tables="BOOKER.D_UNIFIED_CUSTOMER_ORDER_ITEMS,BOOKER.D_MP_ASIN_MANUFACTURER,BOOKER.D_ADDRESSES",
    key_findings="1P filter: full Run-1P set for DUCOI (see references/jp-retail-dimensions.md §1P Retail Filter — all 8 clauses required). Vendor lookup: manufacturer_code='FUJMY' on D_MP_ASIN_MANUFACTURER. Prefecture comes from D_ADDRESSES.postal_code via JP_LOCAL_ISM_DDL.POSTALCD_AREA_PREF_MAP.",
    confidence="high",
)
```

`pinned_tables` is CSV of `SCHEMA.TABLE` refs — case-insensitive, Andi normalises.

**Best practices when calling `ask_andi`:**
- Always set `pinned_tables` when you have ≥1 candidate table from the trace — this is the whole point.
- Include GL vs Category code difference in `key_findings`: `gl_product_group` (2-3 digits) vs `category_code` (8 digits).
- Include filter set + JOIN shape verbatim from the production SQL in `key_findings`.

## Step 7: Present & Confirm (MANDATORY: show full SQL, ask before executing)

Route B queries scan billion-row facts on Andes Workbench — wasted runs cost real compute. **Always show the SQL and stop for confirmation.**

1. Show the **full SQL** in ```sql code blocks (one per query if multiple).
2. Flag any issues you spotted (split strategy, chunking, filter alignment).
3. **STOP — do NOT execute.** Offer: `1. Run it`  `2. Tweak SQL`  `3. Rephrase`.

Route A (query_metrics) is cheap + API-bounded, so it runs without this gate; Route B is not.

## Step 8: Execute

Run `execute_sql` per the plan. If split strategy: run each query → `store_query_result` → `query_local` to merge.

On unexpected **TIMEOUT** — do NOT blindly retry the same SQL. Instead:
1. Check if any billion-row fact is scanned 2+ times → split per Step 5 gate.
2. Check the lookback / date window — if > 6 months on DUCOI/DDAA, chunk.
3. Replace large IN lists (> 500 items) with a JOIN on the attribute table.
4. Only after the structural fix, retry.

`store_query_result` now uses DuckDB's vectorised CSV loader — multi-million-row CSVs load in seconds, not minutes.

## Step 9: Follow-Up

Use `followup_andi` with session_id. Show SQL + confirm before executing.

## SQL Modification Policy

- Structural changes → `followup_andi`
- Trivial edits (filter, LIMIT, date) → edit yourself, show diff
- Query error → `followup_andi` with error message
