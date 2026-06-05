# Advanced VAMOS Recipes (post-RMS migration)

Non-obvious patterns unlocked by `query_metrics` + `query_benchmark`. See
`tool-pitfalls.md` for silent-failure rules.

## CVR at aggregate — works directly via Bruno

All CVR-family metrics (`CONV_RATE_PCT`, `RETAIL_CONVERSION_RATE`, `rt_cvr`,
`DAILY_SOROOS_PERCENTAGE`, `rt_soroos_perc`) work at vendor / GL / category
aggregate scope. No client-side computation needed. Verified 2026-04-29.

## Revenue decomposition framework (ASIN vs ASIN / vendor vs peer)

When comparing two ASINs or vendors, decompose OPS/Revenue into the three
orthogonal drivers:

    OPS = GV × CVR × ASP

Always present all three side-by-side. Wins on CVR + ASP but losing on GV
means **traffic is the bottleneck** (not page quality / pricing). Losing
CVR while winning GV means **conversion** is the bottleneck. ASP gap +
CVR gap tells the "margin vs volume" story.

Recipe:
1. `query_metrics(asin="A,B", metrics="TOTAL_ORDERED_PROD_SALES_AMT,TOTAL_ORDERED_UNITS,GLANCE_VIEW_COUNT,CONV_RATE_PCT,ASP", group_by="ASIN")`
2. Build a 5-row delta table: Metric / A / B / Delta / Winner.
3. Add a "bottleneck" one-liner using the GV-vs-CVR-vs-ASP pattern.

## Scope discovery — no dedicated tool

There is no `list_scopes` in the current toolset. To discover the
brand / category hierarchy for a vendor scope:

```
query_metrics(metrics="OPS", group_by="Category",
                    vendor_code=V, gls=G,
                    start_date=..., end_date=...)
```

Run once over a wide date window; distinct dim values in the result
are the scope. Cache the result session-long — don't repeat per query.

## group_by vs filter — when each applies

- Want **rows per category** for the vendor → `group_by="Category"`.
- Want **vendor rolled up to one row scoped to a category** → `category_codes="22903000"`
  (scope filter). Pair with `group_by` only if you also want another axis.
- Want **per-subcategory rows** → `group_by="SubCategory"` + optional
  `category_codes=` filter to limit the hierarchy.
- Want **both breakdown AND a category filter** (e.g. subcategories inside
  one category) → `group_by="SubCategory"` + `category_codes=<parent>`.

- **One-shot full scorecard** — pass 10-15 metrics in one `query_metrics`
  call; RMS parallelises across Ripple/VBMS automatically (3-10 s).
  *Caveat*: avoid mixing `NET_PPM` / `CONTRIBUTION_MARGIN` with others —
  use `query_benchmark` for profitability metrics.
- **Multi-variation scorecard** —
  `query_metrics(variation="Base", additional_variations="YoYPercent,MoMPercent")`
  → multi-column output in one call.
- **Dimensional × time** —
  `query_metrics(group_by="ASIN,RecordMonth", max_rows=5000)`. Replaces
  the old VBMS-specific ASIN-timeline path.
- **Long-tail exclusion** — no `list_operator=NotIn` yet in `query_metrics`.
  For now, explicit include lists only; flag to add to RMS translator if
  needed.
- **Full ASIN scan** — `max_rows=5000` usually one call. For wider sweeps
  RMS supports `limitStart`/`limitEnd` pagination; expose via translator
  if needed.
- **OPS driver decomposition (GV × CVR × AUP)** — when user asks "why did
  OPS move?" pull the three drivers in one `query_metrics` call:
  `metrics="OPS,GV,Units"` + `variation="YoY"`. Compute client-side:
  `CVR = Units / GV`, `AUP = OPS / Units`. Verify the identity
  `(1+GV%)·(1+CVR%)·(1+AUP%) ≈ (1+OPS%)` — drift <0.5% means clean
  attribution; larger drift = mix shift, call it out. Present as a 3-row
  table (driver / TY / LY / YoY%) with a one-line bottleneck verdict
  (traffic vs conversion vs price).
- **Multi-peer benchmark** — `query_benchmark(peer_manufacturers="P1,…,P10")`.
- **ASIN scorecard** — `query_metrics(asin="B…")` alone. Both `gls` and
  `vendor_code` are optional in ASIN mode; RMS auto-resolves the ASIN's
  catalog entry. No need to run a SQL lookup first for GL. Only pass
  `gls=` when you explicitly want to constrain to a subset.
- **Multi-GL ASIN lists** — ASIN mode handles ASINs spanning multiple GLs
  in one call. You do NOT need to drop to Route B SQL just because the
  list mixes GLs (e.g. 43 ASINs across Beauty + HPC). Only fall back to
  SQL if you need dimensions RMS doesn't expose at ASIN scope.
- **Name-based filters** — pass `brand_names=アタック,…` as scope filter.
- **Multi-GL landscape** — `query_metrics(gls="121,199", vendor_code="")`
  gets a GL-level rollup; use `group_by=GL_PRODUCT_GROUP` to break it down.
- **JBP/OP2 goal overlay** — `query_metrics(goal_tracking="JBP")` merges
  in target values from `vamos-goalmanagement-ro-mcp` automatically.
- **Date range snapshot pinning** — `baseline_date=YYYY-MM-DD` forces RMS
  to report the data as of that snapshot (reproducible backfill
  analyses). Not exposed in the tool today; use `build_get_vendor_metrics_request`
  directly if needed.

## QBR summary (topline + bottomline, category-level)

The QBR pattern is a 2-pass query:

1. **Topline** (OPS / Units / GV / CVR / ASP) via `query_metrics` with
   `group_by="Category"` + `variation="YoY"`.
   CVR works directly at aggregate scope via Bruno — no client-side math needed.
2. **Bottomline** (CP / CM / CPPU / COOP) via `query_benchmark` (vendor-level,
   joined at chat time) OR via Route B SQL on `JCI_BI.O_WBR_CP_FE`
   when category-level bottomline is needed.

Present: two adjacent tables with the same row ordering. Flag categories
where Revenue vs OP2 < -5% (underperformance) or CM erosion YoY > 3pp.

## 3-phase co-purchase template (Route B)

When asked "customers of X also bought Y" for a vendor/category pair:

1. **Phase A — discover categories / brands** (single SQL on `D_MP_ASIN_CATS` /
   `D_MP_ASIN_SUBCATS` + `D_MP_ASIN_MANUFACTURER`). Output: category codes.
2. **Phase B — cohort & target in parallel** (two `execute_sql` calls):
   - Cohort = distinct customers who bought X in period P.
   - Target rows = customers × purchases of Y in period P.
3. **Phase C — local JOIN** via `store_query_result` + `query_local`.
   Produces the co-purchase ranking.

Pattern works for: brand A customers → brand B purchases, seed ASIN →
related ASINs, cross-category buying signals. Single-scan CTE works when
both X and Y share the same fact table (e.g. DUCOI) — otherwise split.

## Single-scan + CASE bucketing (multi-period NTA / NTB)

When comparing customer counts across ≥ 2 periods on the same fact table,
prefer ONE scan with `CASE WHEN order_day BETWEEN ... THEN 1 END` per
bucket over N separate scans. Keeps the plan to one pass, reduces
Andi-generated SQL count.

Template:

```sql
SELECT asin,
  COUNT(DISTINCT CASE WHEN order_day BETWEEN DATE '2025-02-06' AND DATE '2025-02-28'
        THEN customer_id END) AS new_cust_2025_02,
  COUNT(DISTINCT CASE WHEN order_day BETWEEN DATE '2026-02-06' AND DATE '2026-02-28'
        THEN customer_id END) AS new_cust_2026_02
FROM BOOKER.D_UNIFIED_CUSTOMER_ORDER_ITEMS ducoi
INNER JOIN (
  SELECT customer_id, asin, MIN(order_day) AS first_order_day
  FROM BOOKER.D_UNIFIED_CUSTOMER_ORDER_ITEMS
  WHERE region_id = 3 AND marketplace_id = 6
    AND asin IN (...)     -- narrow the scan up-front
    AND order_day >= DATE '2025-01-01'
  GROUP BY 1, 2
) fo
  ON fo.customer_id = ducoi.customer_id AND fo.asin = ducoi.asin
  AND fo.first_order_day = ducoi.order_day
WHERE ducoi.region_id = 3 AND ducoi.marketplace_id = 6
GROUP BY 1;
```

## Deal OPS breakdown (TC08, TC38, TC40)

Deal OPS = Best Deal + DOTD + Lightning Deal. VBMS exposes the three
atomically; one `query_metrics` call covers the breakdown:

```python
query_metrics(
    metrics="rt_order_deal_ops,rt_order_best_deal_ops,rt_order_lightning_deal_ops,rt_order_sns_ops_v2",
    vendor_code="AALUX", gls="121",
    start_date="2026-01-01", end_date="2026-03-31",
    group_by="RecordMonth",
    variation="", additional_variations="YoYPercent",
)
```

`rt_order_sns_ops_v2` is included adjacent because SnS is often asked
in the same breath as "promo vs sub" split.

## Composite metrics (compute client-side)

VBMS doesn't expose some commonly-asked metrics as a single atomic name.
When you see one of these, fetch the components in one `query_metrics` call
and compute the composite client-side (one Markdown column per component
plus a final computed column).

| Composite | Formula | Component metrics (all exist in RMS) |
|---|---|---|
| **AB OPS** (Amazon Business sales) | `qty × aup` | `rt_order_amzn_business_qty`, `rt_order_amzn_business_aup_v2` |
| **SnS OPS** (Subscribe & Save) | `qty × aup` | `rt_order_sns_qty`, `rt_order_sns_aup_v2` *or* use `rt_order_sns_ops_v2` directly |
| **NTV rate** (New-To-Vendor %) | `new_cust / total_cust` | `rt_order_new_to_vendor_cust_ids`, `rt_order_cust_ids` |
| **Repeat-customer rate** | `repeat / total` | `rt_order_repeated_to_vendor_cust_count`, `rt_order_cust_ids` |

Rules of thumb:
- Fetch components in one `query_metrics` call (RMS parallelises) —
  no round-trip penalty for adding 2 metrics vs 1.
- Never ask Andi to compute these when the components are already in VBMS.
- Keep raw components in the CSV so future drill-downs can re-derive.
