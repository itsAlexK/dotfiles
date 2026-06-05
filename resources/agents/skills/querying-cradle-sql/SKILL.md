---
name: querying-cradle-sql
description: "Retrieves raw SQL query text for Cradle jobs from Andes. Use when the user wants to see the SQL behind a Cradle job or profile, explore what queries a Cradle account runs, search for SQL patterns across Cradle jobs, or understand the logic of a Cradle pipeline. Triggers on mentions of Cradle SQL, Cradle job queries, Cradle profile SQL, or requests to 'show the SQL for a Cradle job'."
---

# Querying Cradle Job SQL

## Source of truth

Cradle job SQL lives in `DRYAD_METRICS.O_PROFILE_VERSIONS`. This is the authoritative production table — no access request needed, auto-approved.

Query path: `"andes"."dryad_metrics"."o_profile_versions"`

The SQL text is embedded in the `nodes` column as a JSON array. Each SQL node has this structure:
```json
{"type": "SQL", "nodeAttributes": {"type": "SQL", "sql": "<actual SQL text>"}}
```

A single profile can have multiple SQL nodes interleaved with `REGISTER_TEMP_TABLE`, `COALESCE`, and `REPARTITION` nodes.

## Workflow

```
- [ ] Step 1: Query profiles
- [ ] Step 2: Extract SQL from nodes JSON
- [ ] Step 3: Present results
```

### Step 1: Query profiles

Use `mcp__dataquest__execute_sql`. Filter by `state = 'ACTIVE'` and `nodes LIKE '%"type":"SQL"%'`.

**Find SQL for a specific profile name:**
```sql
SELECT id, name, account, version, nodes
FROM "andes"."dryad_metrics"."o_profile_versions"
WHERE state = 'ACTIVE'
  AND nodes LIKE '%"type":"SQL"%'
  AND name LIKE '%<search_term>%'
LIMIT 20
```

**Browse SQL across an account:**
```sql
SELECT id, name, account, version, nodes
FROM "andes"."dryad_metrics"."o_profile_versions"
WHERE state = 'ACTIVE'
  AND nodes LIKE '%"type":"SQL"%'
  AND account = '<account_name>'
LIMIT 20
```

**Avoid BDTCompactor** — those profiles are trivial `SELECT * FROM <uuid>` compaction jobs, not business logic.

### Step 2: Extract SQL from nodes JSON

The `nodes` column is a JSON string. Parse each element and pull `nodeAttributes.sql` where `type = "SQL"`. A profile typically has 1–21 SQL nodes representing sequential pipeline steps (temp views, CTEs, final selects).

### Step 3: Present results

For each profile, show:
- Profile name and account
- One code block per SQL node, labeled (Node 0, Node 1, etc.)
- Node type context (e.g., "followed by REGISTER_TEMP_TABLE for aliasing")

## Key facts

| Fact | Value |
|---|---|
| Total ACTIVE profile versions | ~497M |
| Profiles with SQL nodes | ~32.7M (~6.6%) |
| Compute platform | Always `DRYAD_SPARK` — no other engine |
| SQL dialect | Spark SQL — temp views, CTEs, `${date}` params |
| Parameter style | `${param_name}` substitution |
| Multi-node pattern | SQL nodes interleaved with REGISTER_TEMP_TABLE nodes |

## Top accounts (by SQL profile count)

BDTCompactor, midas-odyssey, PandoraStudio-Marketing, CradleJobsManagementService, wheelhouse-cradle, AlexaShoppingAlfredDataIngestion-Prod, COSMOS-PROD/BETA/GAMMA, BRP_Account_Integrity

## What NOT to use

- `LOOM_STAGING.O_CRADLE_QUERY` — denied, BDT-internal only
- `LOOM_TEST.O_CRADLE_QUERY` — test data
- `LOOM.O_ANDES_CRADLEPROFILE` — profile metadata only, no SQL text
