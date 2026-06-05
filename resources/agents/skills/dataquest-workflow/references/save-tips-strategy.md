# save_run tips Strategy — retrievability + prevention

ALL runs are auto-indexed regardless of tips presence (embed = `user_question +
tips` if tips exist, else `user_question + summary[:800]`). Tips are a quality
signal — they mark the row `has_tips=True` and embed richer context than a bare
summary, boosting both ranking and the chance the agent reads the lesson before
acting. The `runs` index's whole point is **self-learning**: the same friction
must not cost another round-trip next time. The lesson lives in two places per
run:

- **`tips.md`** — the narrative lesson, written by you when you call
  `save_run(... tips=...)`. Embedded alongside `user_question` for stronger
  ranking on similar future queries; surfaced via `search_api_knowledge` /
  `recall_recipes` / `browse_runs`.
- **`run.json`** — the actual `tool_calls` you made (with their final, working
  args). The fix is **baked into the args of past tool_calls** — replaying
  the run via `@<folder-name>` reproduces the exact shape that worked.

For runs that DID hit friction, two independent things to satisfy:

1. **Retrievability** — future search on the user's NL phrasing will surface
   this run with `has_tips=True`, not buried under tipless raw history.
2. **Prevention** — when an agent reads `tips.md` (and replays `run.json`),
   the fix is embedded deeply enough that the friction does not recur on
   copy-paste.

An entry that satisfies one but not the other is waste. This doc is the rubric
for satisfying both. The 3-probe rule below applies to **tipped** runs only —
tipless runs are auto-indexed without a probe gate.

## When to save (friction triggers)

Any one of these counts as friction — check the full list in SKILL.md's
Friction save gate. Common shapes (not exhaustive):

- Tool/API rejected a combo the agent thought would work (ValidationException,
  silent empty result, timeout forcing retry)
- Data-layer quirk requiring a non-obvious workaround applied upstream
  (text escape, type cast, null-handling)
- Schema reality contradicted KB / skill / docstring (column absent, wrong case,
  wrong provider)
- New term/abbreviation the user used that was not in KB
- Mapping derived on the fly (vendor ↔ GL, dimension ↔ code table) that the
  agent had to discover
- Retry-to-correct-result (first call shape failed; second worked) — always a
  save-worthy lesson even if the cause was "obvious in hindsight"
- Hand-crafted a multi-step plan with no existing recipe surfacing during
  Step 1 knowledge trace

**Default bias is to save.** False positives cost a few KB rows; false negatives
compound across sessions.

## Retrievability — be found on future NL queries

### Rule 1: Task-intent framing (not symptom framing)

Users phrase their next query as **what they want**, not **what broke last
time**. The `tips.md` opening sentence (and the `topic` you pass to `save_run`)
must lead with the task intent.

| Symptom framing (weak) | Task-intent framing (strong) |
|---|---|
| `"<Tool> errors with <error message>"` | `"<Domain task> — <what the output delivers>"` |
| `"<Column> missing from <schema>"` | `"<Analysis type> requires <alternative source>"` |
| `"<Retry> fixed <tool> timeout"` | `"<Pattern name> — split strategy for <scale trigger>"` |

Symptom framing only fires if the next user happens to paste the exact error
into the query. Task-intent framing fires on the NL question the user actually
asks.

### Rule 2: Pre-draft 3 probe queries before saving

Treat this as a design constraint, not a post-hoc check. If you can't think of
three distinct angles the run should fire on, the framing is too narrow —
rewrite `tips.md` (and `topic` / `tags`) before the save.

The three angles:

- **(a) Same-language restatement** — paraphrase the user's NL question using
  synonym nouns/verbs. Tests robustness to rewording.
- **(b) Cross-language task intent** — English ↔ Japanese ↔ Chinese
  translation of the task. Tests tag/token coverage across user languages.
- **(c) Domain concept name** — the abstract term an experienced analyst would
  use for this task (cohort-switching, scope-discovery, rate-decomposition,
  event-aligned-yoy). Tests vocabulary-level retrieval.

Record these in the same response as the `save_run` call so the verification
step is trivial.

### Rule 3: Tag with task-intent nouns, not failure nouns

`tags` (in the `manifest`) and any inline tag-like phrasing in `tips.md` are
additive retrieval tokens. Bias them toward the kind of question a future user
would type:

- Good: `cohort`, `switching`, `decomposition`, `scope_discovery`,
  `first_purchase`, `rate_mix_split`, the user's domain vocabulary (JP/ZH/EN)
- Bad: `timeout`, `retry`, `trap`, `silent_wrong`, `error_recovery` —
  symptom tags hit only when the NEXT agent has already failed

Include the user's actual domain words when they used them — they are the
natural query token.

### Rule 4: Post-save verification, loop until pass

Immediately after `save_run` (with `tips` populated):

1. Run `search_api_knowledge` with each of the 3 probes
2. Pass condition — either:
   - (a) New entry is top hit, score ≥ 0.5, OR
   - (b) New entry is top 3 AND every higher-ranked hit is a sibling whose
     `tips.md` already points to the new run by folder name
3. If any probe fails:
   - Edit `runs/<folder>/tips.md` to add missing task-intent tokens
   - Call `runs_index.upsert_run(folder)` to re-embed immediately, OR wait
     for the next session's reconcile to pick up the mtime change
     (note: calling `save_run` again creates a NEW timestamped folder, not
     an update to the existing one)
   - Re-run that probe
4. Repeat until all 3 pass, or user accepts partial coverage

This loop is the difference between "saved it" and "saved it so it works".

## Prevention — make the fix copy-paste proof

Retrievability gets the run in front of the next agent. Prevention makes sure
that agent cannot repeat the friction even by accident.

### Rule 5: Bake the fix into the run, not just prose

`tips.md` describes the lesson in narrative — it is good for *decisions*
(choose X over Y) and *invariants* (always include filter Z). But for
*mechanics* (the exact SQL, the exact tool args), the prevention lives in the
sibling `run.json` — its `tool_calls[*].args` already contain the corrected
shape.

So the right pattern is:

- **`tips.md`** explains *why* the fix is needed (one paragraph), *what to
  watch for* (when this lesson applies), and *cross-references* the run.json's
  tool_calls (e.g. "see tool_call 3 — the full Run-1P set is encoded in the
  WHERE clause").
- **`run.json`** holds the executable shape. Future replay via `@<folder>`
  reuses the args verbatim — escape rules, filter invariants, type casts,
  dedup patterns are already in place.

Don't paraphrase the SQL into `tips.md` prose — the agent will skim prose and
hand-write a degraded version. Point at the run's tool_calls and let replay do
the copying.

### Rule 6: Defensive shapes beat advisory shapes

When the friction is a mechanic (escape, cast, filter, dedup), the run's
`tool_calls` should encode the fix even for cases that do not strictly need
it. Uniform defensive shape is cheaper than conditional reasoning each run.

Example shapes (encode in the `args` of the run's tool_calls, then reference
from `tips.md`):

- String columns round-tripping through a CSV loader — wrap in escape
  expression regardless of whether *this* column has known bad values
- Date partition on billion-row facts — always pin a lower bound, even if the
  query's "all time" intent would technically be unbounded
- 1P retail filter — full 8-condition block on every DUCOI touch, not
  conditional on the downstream metric

The recipe writer treats these as *invariants of the pattern*, not
*fixes for yesterday's bug*. Add a one-line `-- why:` SQL comment on each
invariant inside the SQL args so future readers don't prune them.

### Rule 7: Cross-cutting rules go in multiple places

A rule that applies across many runs (text escape, 1P filter, JP market IDs)
should appear:

- In the run's executable `tool_calls` SQL (copy-paste destination via replay)
- In the `tips.md` narrative — so retrieval surfaces the rule even when the
  user's query phrasing doesn't lead them to that exact run
- (Optionally) in skill `references/*.md` for flow-level reading

Duplication here is intentional redundancy. Search retrieval only surfaces one
entry at a time — the rule has to live wherever the agent might land.

### Rule 8: If the friction recurs, update the existing entry, not add a new one

Post-mortem on a second occurrence:

1. Did the probe queries fail? → retrievability problem. Edit
   `runs/<folder>/tips.md` to strengthen tokens.
2. Did the agent retrieve the run but friction still happened? → prevention
   problem. The old run's `tool_calls` may still reflect the unfixed shape.
   Either (a) re-run the corrected query and let the new run supersede the
   old, or (b) edit `tips.md` to call out the fix explicitly and link to
   the new run.
3. Never "save a new run about the same friction without new data" — that
   fragments retrieval and creates the drift pattern the 2026-05 audit
   cleaned up.

## Anti-patterns to avoid

- Topic / tips.md headline that is an error message — will never fire on
  task-intent queries
- Paraphrasing the SQL fix into `tips.md` prose instead of pointing at the
  run.json `tool_calls` — prose gets skimmed, replay copies args verbatim
- Hardcoding vendor codes, GLs, dates in `tips.md` examples — describe the
  pattern in placeholder terms (`{MFR_CODE}`, `{SUBCAT}`, `relative:quarter_start`)
  so a future agent generalises rather than literally re-uses
- Skipping the 3-probe verification — ships a run that may never surface
- Splitting one friction across multiple `save_run` calls — fragments the
  retrieval target. One run, one tips.md, one set of tool_calls.
- Adding `tips=` text just to bloat the index — runs without `tips` are still
  fully replayable via `@<folder>` and don't pollute retrieval; only set
  `tips=` when there is a genuine lesson worth surfacing.

## See also

- `save-tips-examples.md` — format templates for tips.md content
- `advanced-recipes.md` — multi-step recipe patterns (cohort, new/repeat, split-and-merge)
- Memory: `feedback_auto_save_friction` — save-don't-ask default
- Memory: `feedback_retrievability_first` — probe-and-verify rule
