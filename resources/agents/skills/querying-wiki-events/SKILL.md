---
name: querying-wiki-events
description: "Queries Amazon internal wiki (w.amazon.com) usage events from the ktinsights Andes dataset. Use when the user wants to analyze wiki page traffic, find the most-visited internal wiki pages, understand what employees search for on the wiki, break down wiki usage by job family or location, or explore any behavioral analytics on w.amazon.com. Triggers on mentions of internal wiki, w.amazon.com, wiki page visits, wiki traffic, or KT Insights."
---

# Querying Amazon Internal Wiki Events

## Source of truth

All w.amazon.com user interaction events are in `ktinsights.event`.

Query path: `"andes"."ktinsights"."event"`

Always filter `WHERE propertyid = 'wiki'` to scope to wiki events.

## Schema (key columns)

| Column | Description |
|---|---|
| `eventtimestamp` | When the event occurred |
| `action` | `PAGE_VISIT`, `CLICKED_LINK`, `SEARCHED_FOR`, `LOADED_SEARCH_RESULT`, `CLICKED_SEARCH_RESULT` |
| `propertyid` | Always filter to `'wiki'` |
| `urlpath` | The wiki page path visited (e.g., `/bin/view/Main`) |
| `urlquery` | Search query string (populated for `SEARCHED_FOR` events) |
| `jobfamily` | Employee job family (truncated to 18 chars — e.g., `'Software Developme'`) |
| `jobtitle` | Full job title |
| `level` | Job level (integer); `-32768` = unclassified/FC associate |
| `country`, `city` | Physical location |
| `departmentdescription` | Department name |

## Common queries

**Top pages by visits:**
```sql
SELECT urlpath, COUNT(*) AS visits
FROM "andes"."ktinsights"."event"
WHERE propertyid = 'wiki'
  AND action = 'PAGE_VISIT'
  AND eventtimestamp >= TIMESTAMP '2025-01-01 00:00:00'
GROUP BY urlpath
ORDER BY visits DESC
LIMIT 30
```

**Top search terms:**
```sql
SELECT urlquery, COUNT(*) AS cnt
FROM "andes"."ktinsights"."event"
WHERE propertyid = 'wiki'
  AND action = 'SEARCHED_FOR'
  AND eventtimestamp >= TIMESTAMP '2025-01-01 00:00:00'
GROUP BY urlquery
ORDER BY cnt DESC
LIMIT 20
```

**Usage by job family:**
```sql
SELECT jobfamily, COUNT(*) AS visits
FROM "andes"."ktinsights"."event"
WHERE propertyid = 'wiki'
  AND action = 'PAGE_VISIT'
  AND eventtimestamp >= TIMESTAMP '2025-01-01 00:00:00'
GROUP BY jobfamily
ORDER BY visits DESC
LIMIT 20
```

**Traffic for a specific page or section:**
```sql
SELECT DATE_TRUNC('month', eventtimestamp) AS month, COUNT(*) AS visits
FROM "andes"."ktinsights"."event"
WHERE propertyid = 'wiki'
  AND action = 'PAGE_VISIT'
  AND urlpath LIKE '/bin/view/YourTeam%'
GROUP BY 1
ORDER BY 1
```

## Key facts

| Fact | Value |
|---|---|
| Total events (all-time) | ~6.7 billion |
| Date range | October 2018 → present |
| Page visits | ~4.0B |
| Clicked links | ~1.6B |
| Search events | ~122M |
| Top job families | Software Development (209M/yr), Fulfillment Center (156M/yr) |
| `XXX` values | Placeholder for unclassified employees (FC associates, contractors) |

## Notes

- `jobfamily` is truncated at 18 characters in the raw data
- Level `-32768` means unclassified — common for FC associates and contractors
- `XXX` in jobfamily/jobtitle/country means the employee record has no job classification
- Always add a date filter — the table is ~6.7B rows and full scans are expensive
- `LOADED_SEARCH_RESULT` fires once per search results page load, not per result — use `SEARCHED_FOR` for unique search counts
