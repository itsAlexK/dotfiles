# Troubleshooting: Andes Athena Queries

## Contents
- No output location provided
- Table not found
- Access denied
- Query timeout or slow performance
- Empty results

## No output location provided

**Error:** `No output location provided. You did not provide an output location for your query results.`

**Cause:** The Athena workgroup has no default `ResultConfiguration.OutputLocation`, and none was passed with the query.

**Fix:**
1. Check workgroup config with `manage_aws_athena_workgroups` → `get-work-group`
2. If no output location is set, find a suitable S3 bucket with `list_s3_buckets` — look for buckets with `query-result` in the name
3. Pass the location in `result_configuration`:
   ```json
   {"OutputLocation": "s3://bucket-name/athena-results/"}
   ```

## Table not found

**Error:** `SCHEMA_NOT_FOUND` or `Table not found`

**Common causes and fixes:**

| Cause | Example | Fix |
|---|---|---|
| Three-part name instead of two-part | `"andes"."PROVIDER"."dataset"` | Combine: `"andes"."PROVIDER.dataset"` |
| Missing double quotes | `andes.PROVIDER.dataset` | Add quotes: `"andes"."PROVIDER.dataset"` |
| Wrong provider or dataset name | Typo or case mismatch | Use `list-databases` on `"andes"` catalog to find correct name |
| Dataset not subscribed via Glue | Table exists in Andes but not in Athena | Create a Glue subscription via Andes (use `CreateSubscription` tool) |

**Discovery steps when table is not found:**
1. List all providers: `manage_aws_athena_databases_and_tables` → `list-databases` with `catalog_name: "andes"`
2. Search for partial matches in the database list
3. If provider is found, list its tables: `list-table-metadata` with the database name

## Access denied

**Error:** `Access Denied` or `User is not authorized`

**Possible causes:**
- IAM role lacks `athena:StartQueryExecution` or `s3:PutObject` on the output bucket
- The Andes dataset requires an access request — use `CreateAccessRequest` (requires `LoadAndesContext`)
- The S3 output bucket has a restrictive bucket policy

**Fix:** Check IAM permissions with `get_policies_for_role`. Ensure the role has Athena and S3 access.

## Query timeout or slow performance

**Symptoms:** Query runs for minutes or `FAILED` with timeout.

**Common causes:**
- No partition filter on a large partitioned table — always filter on partition columns
- `SELECT *` on a wide table with many columns — select only needed columns
- No `LIMIT` clause on exploratory queries

**Fix:** Add partition filters and limit clauses:
```sql
-- Instead of this:
SELECT * FROM "andes"."PROVIDER.large_table"

-- Do this:
SELECT col1, col2
FROM "andes"."PROVIDER.large_table"
WHERE ds = '2024-01-15'
LIMIT 100;
```

## Empty results

**Symptoms:** Query succeeds but returns zero rows.

**Possible causes:**
- Partition filter doesn't match any data (wrong date format, future date)
- WHERE clause is too restrictive
- Table genuinely has no data for the given filters

**Debug steps:**
1. Run `SELECT COUNT(*) FROM "andes"."PROVIDER.dataset"` without filters to check total row count
2. Check distinct partition values: `SELECT DISTINCT partition_col FROM "andes"."PROVIDER.dataset" LIMIT 20`
3. Verify date format matches what the table uses (some use `YYYY-MM-DD`, others `YYYYMMDD`)
