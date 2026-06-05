# JP Retail Dimensions — Andes SQL Reference

Route B execution details for dimensions and scopes. Step 1.5 in SKILL.md tells you WHICH tool; this file tells you HOW to write the SQL.

## 1P Retail Filter — MANDATORY for Andes SQL

VAMOS API already filters 1P. Andes SQL must add the complete Run-1P filter set per table.

### DUCOI / DUCSI (`D_UNIFIED_CUSTOMER_ORDER_ITEMS`, `D_UNIFIED_CUST_SHIPMENT_ITEMS`)

```sql
AND region_id = 3 AND marketplace_id = 6
AND merchant_customer_id IN (-1, 12, 720424855, 869744424, 8716442355)
AND is_retail_order_item = 'Y'
AND is_tombstoned = 'N'
AND quantity > 0
AND order_item_level_condition != 6
AND is_free_replacement = 'N'
AND is_liability = 'N'
```

All eight clauses are required — omitting any of them silently mixes in 3P / cancelled / zero-qty / damaged / free-replacement / liability orders, and numbers won't tie to Bruno / VBMS / OP2.

### DDAA (`D_DAILY_ASIN_ACTIVITY`)

```sql
AND region_id = 3 AND marketplace_id = 6
AND is_retail_merchant = 'Y'
```

### D_CUSTOMER_ORDER_ITEMS

```sql
AND seller_customer_id = 12
```

### GV tables (`D_DAILY_ASIN_GV_METRICS`)

No 1P filter needed — GV does not distinguish 1P/3P.

---

If Andi-generated SQL lacks any of these, **add them before `execute_sql`**.

> Some PF/GL wikis list slightly different `merchant_customer_id` sets (e.g. Books uses `473940355`). Above is the general-purpose set.

**Match check:** compare vendor-level SUM to `query_metrics(vendor_code=..., metrics=OPS)` — should be within 1%; if off by > 5%, the filter is wrong.

## Andes Key Tables

| Purpose | Schema | Table | Key Columns |
|---------|--------|-------|-------------|
| ASIN attributes (main) | BOOKER | `D_MP_ASINS` | asin, gl_product_group, category_code, subcategory_code, brand_code, merchant_brand_name |
| ASIN ↔ Brand ↔ Manufacturer | BOOKER | `D_MP_ASIN_BRAND_MANUFACTURER` | asin, brand_code, brand_name, manufacturer_code, manufacturer_name |
| ASIN → Manufacturer (fast) | BOOKER | `D_MP_ASIN_MANUFACTURER` | asin, manufacturer_code |
| Category names | BOOKER | `D_MP_ASIN_CATS` | gl_product_group, product_category, category_desc |
| Subcategory names | BOOKER | `D_MP_ASIN_SUBCATS` | gl_product_group, product_category, product_subcategory, subcategory_desc |
| Browse Node mapping | BOOKER | `O_ASIN_BROWSE_NODE_ASSGMNTS` | browse_node_id, asin |
| 七味 Custom Category | JP_HARDLINE_DDL | `D_ASIN_CUSTOM_ATTR_JP` | custom_cat_name, asin, attribute1~30, update_date |
| 一味 Custom Category | JP_HARDLINE_DDL | `D_ASIN_CC_PRISTINE_JP` | (same schema as above) |
| POD Mapping (Softlines) | sli-team | `dim_pod_mappings_enhanced` | category_code, gl_product_group, big_cat (=POD) |
| Vendor attributes | BOOKER | `O_VENDORS` | vendor_code, vendor_name |
| Vendor group | BOOKER | `O_AMAZON_BUSINESS_GROUPS` | vendor group membership |
| Reporting Week | BOOKER | `O_REPORTING_DAYS` | calendar_day, reporting_year, reporting_week_of_year |
| Daily sales | BOOKER | `D_DAILY_ASIN_ACTIVITY` | activity_day, asin, net_ordered_product_sales, net_ordered_units, net_ordered_gms_amt |
| Daily GV | GLANCE_VIEW_METRICS | `D_DAILY_ASIN_GV_METRICS` | snapshot_day, asin, glance_view_count |
| Daily GV (rollup) | GLANCE_VIEW_METRICS | `DPI_ASIN_ROLLUPS_DAILY` | snapshot_day, asin, glance_views (use when `D_DAILY_ASIN_GV_METRICS` permission denied) |
| Customer order detail | BOOKER | `D_CUSTOMER_ORDER_ITEMS` | order_day, customer_id, asin, ordered_units |
| B2B customer order | ABBD_DTL | `D_AB_UNIFIED_CUST_ORDER_ITEMS` | order_day, customer_id, asin, is_business_order, business_id |
| Deal / Coupon attribution | PROMOTION_METRICS | `A_DAILY_PROMOTION_METRICS` | activity_day, asin, promo_type, promo_code, discount_amt (check access — some users need Datanet permission) |
| Contribution Profit (weekly) | JCI_BI | `O_WBR_CP_FE` | region_id, marketplace_id, week_id, gl_product_group, category_code, cp, cm, cppu, coop, units |
| Browse Node assignment | pk-assignment-platform | `O_ASIN_BROWSE_NODE_ASSGMNTS` | asin, browse_node_id, region_id, marketplace_id |

## Parent / Child ASIN

`BOOKER.D_MP_ASINS.parent_asin_id` (or `parent_asin`) links children to
their parent. To expand "Parent B0XXX → all child ASINs":

```sql
SELECT asin
FROM andes.BOOKER.D_MP_ASINS
WHERE region_id = 3 AND marketplace_id = 6
  AND parent_asin_id = :parent
```

Tool-side: for metrics, prefer `query_metrics(asin=<comma-separated children>)`
once you have the child list; do not rely on RMS to expand a parent
ASIN automatically — `ParentAsin` is an RMS dimension for `group_by`,
not a scope filter.

## Brand — Andes SQL Columns

| Type | Table | Column |
|------|-------|--------|
| Brand code | `D_MP_ASINS` | `brand_code` |
| Brand name (internal) | `D_MP_ASIN_BRAND_MANUFACTURER` | `brand_name` |
| Brand name (website display) | `D_MP_ASINS` | `merchant_brand_name` |

`brand_name` ≠ `merchant_brand_name` — internal name vs what customer sees on the product page.

## POD (Softlines Only)

POD = Product-Oriented Division, a JP Softlines layer between GL and Category. Applicable GLs: 193 (Apparel), 309 (Shoes/Bags), 241 (Watches), 197 (Jewelry), 641 (Private Label).

Full reference — native VAMOS scope filter (`pods=` param), how to use at Andes SQL level, POD → Category Code mapping table — lives in playbook: search for `official_softlines_pod_mapping`.

## Browse Node

Not a VAMOS dimension. Andes SQL only:

```sql
JOIN BOOKER.O_ASIN_BROWSE_NODE_ASSGMNTS bn
  ON bn.asin = fact.asin
  AND bn.region_id = 3 AND bn.marketplace_id = 6
WHERE bn.browse_node_id = {user's node}
```

## 七味 Custom Category (Shichimi / ISS)

Not a VAMOS dimension. Andes SQL only. Full recipe (table schema, naming convention, dedup pattern, monthly YoY query template, permission notes) lives in playbook — search for `official_shichimi_custom_category`.

## Vendor Code — Andes SQL Tables

| Type | Key Table | Column |
|------|-----------|--------|
| Manufacturer | `D_MP_ASIN_BRAND_MANUFACTURER` / `D_MP_ASIN_MANUFACTURER` | `manufacturer_code` |
| Company vendor | `O_VENDORS` | `company_vendor_code` |
| Distributor vendor | `O_VENDORS` | `vendor_code` |

## Deal Events

Many JP Retail analyses are framed by Deal Events (Prime Day / BF / MDE / FDE / HDE / CDE / 初売り, etc.) rather than calendar periods. Full reference (event code patterns + `andes.CAMS_JP.JP_DEAL_EVENT_SCHEDULE` lookup SQL + event-aligned YoY handling) lives in playbook — search for `official_event_dates_schedule`.

**Key rule (load-bearing — repeat here):** Route A `variation=YoY` aligns by calendar date, not event window. For "PD25 vs PD24", look up BOTH years' event dates and run TWO `query_metrics` calls, compare client-side.

## Amazon Reporting Week (WK resolution)

**Never hand-calculate WK numbers from today's date.** Amazon Reporting Week is Sun-start and year-specific — it is NOT ISO week.

**Source of truth:** `andes.BOOKER.O_REPORTING_DAYS` (columns: `calendar_day`, `reporting_year`, `reporting_week_of_year`, `calendar_year`, `calendar_month_of_year`, `calendar_qtr`).

> **Schema note:** Older docs point at `AIM_BI_DDL.O_REPORTING_DAYS` — that path does not resolve in Andes Workbench (returns `DATABASE_NOT_SUPPORTED_ERROR`). Always use `BOOKER`. Platform-level calendar dimensions live in `BOOKER` because it is the canonical, cross-team schema; `*_DDL` schemas are team-owned derivative layers and can move or get deprecated during team reorgs.

**When the user says "WK15" without a year:**
1. Prefer asking the user for the year — fastest and safest.
2. If you must resolve automatically, run:
   ```sql
   SELECT reporting_year, reporting_week_of_year,
          MIN(calendar_day) AS start_day, MAX(calendar_day) AS end_day
   FROM "andes"."BOOKER"."O_REPORTING_DAYS"
   WHERE reporting_week_of_year = 15
     AND reporting_year IN ({prior_year}, {current_year})
   GROUP BY reporting_year, reporting_week_of_year
   ORDER BY reporting_year
   ```
3. Pick the most recently-completed WK row (`end_day < today`). If both years' WKs are already completed, the one the user means is almost always the closer-to-today year.
4. Do not infer by Sun-start arithmetic — past drifts, fiscal boundaries, and year-spanning weeks make that unreliable.
