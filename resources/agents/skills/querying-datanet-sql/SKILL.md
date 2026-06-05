---
name: querying-datanet-sql
description: "Retrieves raw SQL query text for DataNet jobs from Andes. Use when the user wants to see the SQL behind a DataNet extract or load job, browse queries for a DataNet profile, search for SQL patterns across DataNet jobs, or understand the logic of a DataNet pipeline. Triggers on mentions of DataNet SQL, DataNet extract queries, DataNet profile SQL, or requests to 'show the SQL for a DataNet job'."
---

# Querying DataNet Job SQL

## Source of truth

DataNet extract job SQL lives in `BDT_ANALYTICS_PROD.DWP_EXTRACT_JOB_PROFILES`. This is the accessible production table — no access request needed.

Query path: `"andes"."bdt_analytics_prod"."dwp_extract_job_profiles"`

The SQL is embedded in the `xml` column as a `PASS_THROUGH_SQL` XML attribute:
```xml
<REQUEST ...>
  <QUERY PASS_THROUGH_SQL="<actual SQL here>" />
</REQUEST>
```

The XML may contain HTML entities (`&apos;` = `'`, `&lt;` = `<`, `&gt;` = `>`, `&#xd;&#xa;` = CRLF). Decode before presenting.

## Profile types

| extract_profile_type_id | Type name | Description |
|---|---|---|
| 1 | INCREMENTAL | Incremental extract with `dw_last_updated` watermark |
| 2 | TRANSFORM | Transformation/aggregation jobs |
| 3 | DATA_FEED / REPORT | Published reports, often with rolling date windows |
| 7 | SQL_LOAD | DML loads with `ETLM` dependency declarations |
| 5 | DSS | DSS-style extracts |
| 16 | GRASSHOPPER | Grasshopper jobs |

## Workflow

```
- [ ] Step 1: Query profiles
- [ ] Step 2: Extract SQL from XML
- [ ] Step 3: Present results
```

### Step 1: Query profiles

Use `mcp__dataquest__execute_sql`.

**Find SQL for a specific job by description:**
```sql
SELECT extract_job_profile_id, revision, description, extract_profile_type_id, xml
FROM "andes"."bdt_analytics_prod"."dwp_extract_job_profiles"
WHERE xml LIKE '%PASS_THROUGH_SQL%'
  AND status = 'ACTIVE'
  AND description LIKE '%<search_term>%'
LIMIT 10
```

**Get latest revision per profile (avoid duplicate revisions):**
```sql
SELECT extract_job_profile_id, MAX(revision) AS latest_revision
FROM "andes"."bdt_analytics_prod"."dwp_extract_job_profiles"
WHERE xml LIKE '%PASS_THROUGH_SQL%'
  AND status = 'ACTIVE'
GROUP BY extract_job_profile_id
LIMIT 20
```

**Browse by job type:**
```sql
SELECT extract_job_profile_id, revision, description, xml
FROM "andes"."bdt_analytics_prod"."dwp_extract_job_profiles"
WHERE xml LIKE '%PASS_THROUGH_SQL%'
  AND extract_profile_type_id = 7  -- SQL_LOAD
LIMIT 10
```

### Step 2: Extract SQL from XML

Parse the `PASS_THROUGH_SQL` attribute value out of the XML string. Decode HTML entities. The result is plain Oracle or Redshift SQL.

**Common SQL patterns found:**
- Oracle: `ALTER SESSION FORCE PARALLEL QUERY PARALLEL 16`, `(+)` outer joins, `to_date('{PARAM}', 'YYYY/MM/DD HH24:MI:SS')` watermarks
- Redshift: CTEs with `/*+ETLM {depend:{...}}*/` dependency hints, `CREATE TEMPORARY TABLE ... distkey(...)`
- Parameters: `{END_OF_DAY_AS_UTC}`, `{RUN_DATE_YYYYMMDD}`, `{LEGAL_ENTITY_ID}`

### Step 3: Present results

Show:
- Profile ID, revision, description, type
- The extracted SQL in a code block (decoded, not raw XML)

## Key facts

| Fact | Value |
|---|---|
| Total rows (all revisions) | ~80.8M |
| SQL dialect | Oracle SQL (legacy) or Redshift SQL (newer) |
| Parameter style | `{PARAM_NAME}` curly-brace substitution |
| XML truncation | Very long XMLs may be truncated by Athena — use `xml_location` (S3 URL column) to fetch full source |

## Truncation fallback

If the `xml` column is truncated, each row has an `xml_location` column with an S3 URL to the full untruncated XML. Fetch it if you need the complete SQL.

## What NOT to use

- `LOOM_STAGING.O_DATANET_QUERY` — denied, BDT-internal only
- `LOOM_STAGING.O_DATANET_EXTRACT_QUERY` — denied, BDT-internal only
- `LOOM_TEST.*` — test data only
