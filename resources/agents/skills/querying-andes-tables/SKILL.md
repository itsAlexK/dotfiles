---
name: querying-andes-tables
description: "Query Amazon Andes data catalog tables using AWS Athena. Use when the user wants to run SQL against Andes datasets, explore Andes table schemas, check what data is in an Andes table, or troubleshoot Athena queries against the 'andes' catalog. Triggers on mentions of Andes tables, Andes datasets, Athena queries referencing the andes catalog, or table names containing dot-delimited provider/dataset patterns like 'PROVIDER_NAME.table_name'."
---

# Querying Andes Tables via Athena

## What is Andes?

Andes is Amazon's internal data catalog and governance platform. It organizes datasets under **providers** (teams/orgs that own data) and **datasets** (individual tables). When Andes datasets are subscribed to via Glue, they become queryable through Athena under the `"andes"` catalog.

Key concepts:
- **Provider**: The team or organization that owns and publishes a dataset (e.g., `JP_HARDLINE_DDL`)
- **Dataset**: A specific table within a provider (e.g., `d_asin_cc_description`)
- **Catalog**: In Athena, Andes tables live under the `"andes"` catalog
- **Table naming**: Andes tables in Athena use the format `"andes"."PROVIDER_NAME.dataset_name"`

## Qualifying an Andes table name

Andes tables in Athena require a specific fully-qualified format. This is the most common source of errors.

**Correct format:**
```sql
SELECT * FROM "andes"."PROVIDER_NAME.dataset_name" LIMIT 10;
```

Rules:
1. The catalog is always `"andes"` (double-quoted)
2. The schema+table is a **single dot-delimited string** in double quotes: `"PROVIDER_NAME.dataset_name"`
3. There is NO separate schema — the provider and dataset are combined into one identifier
4. Both parts must be double-quoted together as one string

**Common mistakes:**
```sql
-- WRONG: Three-part name with separate schema
SELECT * FROM "andes"."PROVIDER_NAME"."dataset_name"

-- WRONG: Missing quotes
SELECT * FROM andes.PROVIDER_NAME.dataset_name

-- WRONG: Single quotes
SELECT * FROM 'andes'.'PROVIDER_NAME.dataset_name'

-- CORRECT
SELECT * FROM "andes"."PROVIDER_NAME.dataset_name"
```

## Workflow

Copy this checklist and track progress:

```
Query Progress:
- [ ] Step 1: Resolve output location
- [ ] Step 2: Build the qualified query
- [ ] Step 3: Execute the query
- [ ] Step 4: Poll for completion
- [ ] Step 5: Retrieve and present results
```

### Step 1: Resolve output location

Athena requires an S3 output location for query results. Check in this order:

1. **Check workgroup config** — use `manage_aws_athena_workgroups` with `get-work-group` on `primary`. If `ResultConfiguration.OutputLocation` is set, use it.
2. **Find an existing results bucket** — use `list_s3_buckets` and look for buckets with `query-result` in the name. Prefer actively-used buckets (high object count, recent `last_modified`).
3. **Ask the user** — if no suitable bucket is found, ask for an S3 path.

Use the resolved location as:
```json
{"OutputLocation": "s3://BUCKET_NAME/athena-results/"}
```

### Step 2: Build the qualified query

Given user input, construct the properly qualified query:

- If the user provides a raw table name like `JP_HARDLINE_DDL.d_asin_cc_description`, wrap it: `"andes"."JP_HARDLINE_DDL.d_asin_cc_description"`
- If the user already provides a fully qualified name, validate the quoting
- Always add `LIMIT` if the user doesn't specify one (default to `LIMIT 100`) to avoid scanning excessive data

### Step 3: Execute the query

Use `manage_aws_athena_query_executions` with `start-query-execution`:

```
operation: start-query-execution
query_string: <the SQL>
result_configuration: {"OutputLocation": "s3://bucket/athena-results/"}
work_group: primary
```

Save the returned `query_execution_id`.

### Step 4: Poll for completion

Use `get-query-execution` with the `query_execution_id`. Check `Status.State`:

- **SUCCEEDED** → proceed to Step 5
- **RUNNING** / **QUEUED** → poll again after a few seconds
- **FAILED** → read `Status.AthenaError` or `Status.StateChangeReason`. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Step 5: Retrieve and present results

Use `get-query-results` with the `query_execution_id`. Format the results as a readable table. Include:
- Row count
- Data scanned (from `Statistics.DataScannedInBytes`)
- Execution time (from `Statistics.EngineExecutionTimeInMillis`)

## Discovering Andes tables

If the user doesn't know the exact table name:

1. **List databases in the andes catalog**: Use `manage_aws_athena_databases_and_tables` with `list-databases` and `catalog_name: "andes"`
2. **List tables in a database**: Use `list-table-metadata` with the database (provider) name
3. **Get table schema**: Use `get-table-metadata` for column details before querying

For Andes-specific dataset search, use the `SearchDatasets` tool (requires LoadAndesContext first).

## Advanced topics

- **Schema and column details**: See [REFERENCE.md](REFERENCE.md)
- **Common errors and fixes**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
