# Reference: Andes Tables in Athena

## Contents
- Andes data model
- Table naming deep dive
- Schema and column inspection
- Partition handling
- Query patterns
- Tool reference

## Andes data model

```
Andes Catalog
└── Provider (e.g., JP_HARDLINE_DDL)
    └── Dataset (e.g., d_asin_cc_description)
        └── Version (e.g., v1, v2)
            └── Columns, partitions, data
```

- **Providers** map to Athena databases inside the `"andes"` catalog
- **Datasets** map to tables within those databases
- **Versions** are managed by Andes lifecycle; Athena typically points to the active version
- A dataset may have multiple versions; subscriptions determine which version is queryable

## Table naming deep dive

Athena uses a three-level hierarchy: `catalog.database.table`. Andes collapses provider+dataset into the database level:

| Athena concept | Andes mapping | Example |
|---|---|---|
| Catalog | Always `"andes"` | `"andes"` |
| Database | `PROVIDER_NAME.dataset_name` (combined) | `"JP_HARDLINE_DDL.d_asin_cc_description"` |
| Table | Not used separately | — |

The dot inside `"PROVIDER_NAME.dataset_name"` is literal — it's part of the database identifier, not a separator. This is why the entire string must be double-quoted as one unit.

### Provider naming conventions

Provider names typically follow patterns:
- Team/org abbreviation: `JP_HARDLINE_DDL`, `BDT_ANALYTICS`
- Service name: `RETAIL_CATALOG`, `SUPPLY_CHAIN`
- Case: Usually UPPER_CASE with underscores

### Dataset naming conventions

Dataset names typically follow patterns:
- Prefix `d_` for dimension tables, `f_` for fact tables
- Descriptive: `d_asin_cc_description`, `f_daily_sales`
- Case: Usually lower_case with underscores

## Schema and column inspection

### Get column details before querying

```
Tool: manage_aws_athena_databases_and_tables
Operation: get-table-metadata
catalog_name: andes
database_name: PROVIDER_NAME.dataset_name
table_name: PROVIDER_NAME.dataset_name
```

This returns column names, types, partition keys, and table parameters.

### Common column types in Andes tables

| Athena type | Description |
|---|---|
| `varchar` | Variable-length string (most common) |
| `integer` / `bigint` | Numeric identifiers and counts |
| `double` | Floating-point values |
| `timestamp` | Date/time without timezone |
| `timestamp with time zone` | Date/time with timezone (common for `update_date` columns) |
| `date` | Date only |
| `boolean` | True/false |

## Partition handling

Many Andes tables are partitioned by date or region. Partitioned columns appear in query results but also serve as filters for scan optimization.

**Always filter on partition columns when possible:**
```sql
-- Good: filters on partition, scans less data
SELECT * FROM "andes"."PROVIDER.dataset"
WHERE region_id = 1 AND ds = '2024-01-15'
LIMIT 100;

-- Bad: full table scan
SELECT * FROM "andes"."PROVIDER.dataset"
LIMIT 100;
```

To discover partition columns, use `get-table-metadata` and check the `PartitionKeys` field.

## Query patterns

### Preview table data
```sql
SELECT * FROM "andes"."PROVIDER.dataset" LIMIT 10;
```

### Count rows
```sql
SELECT COUNT(*) FROM "andes"."PROVIDER.dataset";
```

### Check distinct values in a column
```sql
SELECT DISTINCT column_name
FROM "andes"."PROVIDER.dataset"
LIMIT 100;
```

### Filter with WHERE
```sql
SELECT col1, col2
FROM "andes"."PROVIDER.dataset"
WHERE col1 = 'value'
LIMIT 100;
```

### Aggregate
```sql
SELECT column_name, COUNT(*) as cnt
FROM "andes"."PROVIDER.dataset"
GROUP BY column_name
ORDER BY cnt DESC
LIMIT 20;
```

## Tool reference

| Task | Tool | Operation |
|---|---|---|
| Run a query | `manage_aws_athena_query_executions` | `start-query-execution` |
| Check query status | `manage_aws_athena_query_executions` | `get-query-execution` |
| Get query results | `manage_aws_athena_query_executions` | `get-query-results` |
| List databases (providers) | `manage_aws_athena_databases_and_tables` | `list-databases` |
| List tables in a provider | `manage_aws_athena_databases_and_tables` | `list-table-metadata` |
| Get table schema | `manage_aws_athena_databases_and_tables` | `get-table-metadata` |
| Check workgroup config | `manage_aws_athena_workgroups` | `get-work-group` |
| Find S3 buckets | `list_s3_buckets` | — |
| Search Andes datasets | `SearchDatasets` (requires `LoadAndesContext`) | — |
