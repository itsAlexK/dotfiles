# Iterative Technical Document Review

## Overview

This SOP creates or improves a technical document through independent candidate writers, an iterative critic, and a three-judge acceptance panel. Use it for rigorous drafting, random-topic skill evaluation, or high-stakes design review where the author must not grade its own work.

## Parameters

- **topic** (optional, default: "random"): A supplied technical design prompt, path to a brief, or the literal value `random` to select from `evaluations/topic-bank.json`
- **document_type** (optional, default: "auto"): One of `one-pager`, `hld`, `prfaq`, `lld`, or `auto`
- **output_dir** (optional, default: ".technical-doc-review"): Directory for the brief, evidence, drafts, critiques, panel votes, and final result
- **random_seed** (optional): Reproducible seed used only when `topic` is `random`
- **max_revision_rounds** (optional, default: 4): Maximum critic-guided writer revisions before the first panel
- **max_panel_rounds** (optional, default: 2): Maximum panel rejection and revision cycles
- **acceptance_threshold** (optional, default: 4): Minimum score from 1 to 5 required on every rubric dimension from every panel judge

**Constraints for parameter acquisition:**
- If all required parameters are already provided, You MUST proceed to the Steps
- If any required parameters are missing, You MUST ask for them before proceeding
- When asking for parameters, You MUST request all parameters in a single prompt
- When asking for parameters, You MUST use the exact parameter names as defined
- You MUST treat omitted optional parameters as their documented defaults

## Steps

### 1. Initialize the review workspace

Resolve the skill root as the parent directory of this SOP's `agent-sops` directory. Create a new run directory under `output_dir` with subdirectories for `evidence`, `candidates`, `rounds`, and `panel`.

If `topic` is `random`, run:

```bash
python3 <skill_root>/scripts/select_review_topic.py \
  --document-type <document_type> \
  --output <run_dir>/brief.json
```

Add `--seed <random_seed>` when a seed was provided. If `topic` is supplied, write a structured brief to `<run_dir>/brief.json` containing the topic, decision, document type, audience, scenario constraints, facts requiring research, and requested output.

**Constraints:**
- You MUST use a unique run directory so concurrent or prior runs cannot overwrite each other.
- You MUST preserve user-provided constraints as scenario assumptions and MUST NOT mislabel them as externally verified facts because synthetic design prompts commonly contain invented workload values.
- You MUST validate that `brief.json` contains `id`, `title`, `document_type`, `decision`, `audience`, `prompt`, and `constraints` before proceeding.
- If `document_type` is `auto`, You MUST classify it by the decision boundaries in `SKILL.md` and write the resolved type back to `brief.json`.
- Once resolved, You MUST lock `document_type` and `decision` for the run because the panel must judge the deliverable the user requested.
- You MUST NOT replace the locked document type or decision unless the user explicitly approves the change and `brief.json` records that approval, because otherwise the panel would review a different task from the one requested.
- If initialization or validation fails, You MUST hard stop because later agents require stable file paths and a complete brief.

### 2. Build an evidence pack

Dispatch up to three independent research subagents in parallel: one for primary technology sources, one for operational and failure-mode evidence, and one for credible alternatives. Each subagent receives the absolute path to `brief.json`, loads the `writing-technical-docs` skill, and writes only to its assigned file under `<run_dir>/evidence/`.

**Constraints:**
- You MUST use isolated subagents because source retrieval and domain research would otherwise flood the orchestrator context.
- You MUST assign distinct absolute output paths before dispatch because parallel agents must never select or share output filenames.
- Researchers MUST prefer primary documentation, specifications, source code, papers, and measured results.
- Researchers MUST label each item as `verified fact`, `scenario constraint`, `assumption`, or `open question`.
- Researchers MUST include a URL or local source path for every verified fact and MUST NOT invent a metric when evidence is unavailable because unsupported precision weakens the review.
- You MUST retry a failed research assignment once with its validation error. After a second failure, You MAY continue only if the missing evidence is not decision-critical and is recorded as an open question.
- You MUST write an evidence index to `<run_dir>/evidence/index.md` that links the research files without copying their full contents into the orchestrator conversation.

### 3. Produce independent candidate drafts

Dispatch two writer subagents in parallel. Both receive the absolute paths to `brief.json`, the evidence index, and the selected document-type references. Writer A emphasizes the clearest decision argument. Writer B independently seeks a materially different but defensible structure or recommendation.

**Constraints:**
- Each writer MUST load the `writing-technical-docs` skill and follow its routed references.
- Each writer MUST write its argument map and draft to separate assigned paths under `<run_dir>/candidates/`.
- Writers MUST NOT read the other candidate because independence reduces anchoring.
- Writers MUST distinguish facts, scenario constraints, and assumptions and MUST link decision-relevant evidence.
- Writers MUST define unfamiliar terms before dependency and compare the status quo and strongest alternative against common criteria.
- Writers MUST answer the locked document type and decision. They MAY make the recommendation conditional on named assumptions, but MUST NOT substitute approval of research, prototyping, or another artifact for the requested decision because that changes the user's deliverable.
- You MUST validate that both candidates contain a visible decision, problem, criteria, recommendation, alternatives, tradeoffs, risks, and open questions appropriate to the document type.
- If one writer fails after one retry, You MAY proceed with the valid candidate and record the loss of independent comparison.

### 4. Select and synthesize the base draft

Dispatch an isolated selection judge with both candidate paths, the brief, evidence index, and `reference/review-rubric.md`. The judge writes `<run_dir>/selection.json` with per-dimension scores, a selected base, transferable strengths from the other candidate, and blocking gaps. Then dispatch a revision writer to produce `<run_dir>/rounds/round-0/draft.md` and `change-log.md`.

**Constraints:**
- The selection judge MUST evaluate both candidates against the same rubric and MUST NOT prefer a candidate for polish when its reasoning or evidence is weaker.
- The selection judge MUST reject a candidate that changes the locked document type or decision, even when the substitute document is internally coherent.
- The selection judge MUST NOT rewrite either draft because selection and authorship require separate contexts.
- The revision writer MUST preserve the selected draft's defensible claims and MAY incorporate only strengths that do not create contradictions.
- The revision writer MUST record each material synthesis decision in `change-log.md`.
- You MUST validate that the base draft resolves every blocking selection finding or explicitly records it as an open question before proceeding.

### 5. Run critic and revision rounds

For each round from 1 through `max_revision_rounds`, dispatch a fresh isolated critic with the current draft, brief, evidence index, and review rubric. The critic writes `critique.json` with a verdict of `REVISE` or `READY_FOR_PANEL`, dimension scores, blocking findings, and advisories. If the verdict is `REVISE`, dispatch a writer to create the next round's draft and change log.

**Constraints:**
- The critic MUST verify technical claims against the evidence pack and MUST identify unsupported claims rather than silently accepting plausible text.
- The critic MUST trace idea order and first-use definitions from top to bottom.
- The critic MUST report only findings that name a location, consequence, and required evidence or change.
- The critic MUST NOT rewrite passages because the writer must retain responsibility for resolving interacting findings.
- The critic MUST judge request fidelity before section coverage and MUST NOT resolve missing premises by changing the locked decision because only the user may approve that scope change.
- The writer MUST address every blocking finding, record the disposition in the next change log, and MUST NOT delete a valid cost or uncertainty merely to improve a score.
- You MUST use a fresh critic context for every round because accumulated collaboration can weaken adversarial review.
- You MUST stop the critic loop early when the critic returns `READY_FOR_PANEL`.
- If the final allowed critic round still returns `REVISE`, You MUST preserve the best draft and proceed to Step 9 as not accepted because an unbounded loop can consume resources without resolving a missing premise.
- If acceptance requires user-supplied evidence or a different decision, You MUST stop and report that dependency rather than allowing the writer to invent facts or rewrite the brief.

### 6. Run deterministic prose validation

Run the style checker on the panel candidate:

```bash
python3 <skill_root>/scripts/check_style.py <candidate_path> --quiet
```

If it exits `1`, dispatch one prose revision writer with the checker output and re-run the checker. Store the final checker output in `<run_dir>/style-check.txt`.

**Constraints:**
- You MUST run the checker rather than asking a judge to estimate measured style properties.
- The prose writer MUST NOT change technical claims, quantities, decisions, or tradeoffs because this pass addresses expression only.
- You MUST allow at most two prose-only revisions. If hard failures remain, You MUST mark the style check failed and continue only to produce a rejection record.
- You MUST NOT treat band deviations alone as deterministic rejection because short documents can legitimately fall outside corpus bands.

### 7. Dispatch the acceptance panel

Dispatch three judges in parallel with no access to each other's work:

1. `argument`: decision clarity, claim/evidence/warrant chains, idea flow, terms, and fair alternatives
2. `technical`: factual correctness, feasibility, requirements, failure modes, operations, and evidence
3. `document`: document-type fit, audience, progressive disclosure, diagrams/tables, and measured prose

Each judge receives the candidate, brief, evidence index, review rubric, and an assigned output path named `judge-<role>.json`.

**Constraints:**
- You MUST use independent subagents because the final judges must not inherit the writer's confidence or another judge's vote.
- Every judge MUST score every rubric dimension even when one dimension is outside its specialty.
- Every judge MUST use the exact JSON schema in `reference/review-rubric.md`.
- Every judge MUST compare the candidate with the locked `document_type` and `decision`; a substituted deliverable is a blocking request-fidelity failure.
- A judge voting `REVISE` MUST provide at least one blocking finding.
- Judges MUST NOT rewrite the document because the panel decides acceptance rather than authorship.
- You MUST validate all three JSON files before aggregation and retry one malformed review once.

### 8. Aggregate the panel decision

Run:

```bash
python3 <skill_root>/scripts/aggregate_review_panel.py \
  --reviews-dir <panel_round_dir> \
  --threshold <acceptance_threshold> \
  --output <panel_round_dir>/decision.json \
  <style_check_flag>
```

Use `--style-check-passed` only when Step 6 exited `0`.

**Constraints:**
- You MUST use the aggregation script because vote counts, score thresholds, and schema checks are deterministic.
- You MUST accept only when the script returns `0`.
- You MUST NOT reinterpret a `REVISE` result as acceptance because the script enforces unanimous votes, minimum scores, no blockers, and a passing style check.
- If the panel rejects and panel rounds remain, You MUST consolidate non-duplicate blocking findings, dispatch a writer revision, return to Step 6, and then dispatch a fresh panel.
- If no panel rounds remain, You MUST continue to Step 9 with status `NOT_ACCEPTED` and preserve every unresolved blocker.

### 9. Publish the result

Copy the accepted candidate, or the best non-accepted candidate, to `<run_dir>/final.md`. Write `<run_dir>/run-summary.md` with the topic, document type, source draft, revision count, style-check result, panel decision, unresolved blockers, and paths to all artifacts.

**Constraints:**
- You MUST label the result `ACCEPTED` only when Step 8 returned acceptance.
- You MUST label an exhausted run `NOT_ACCEPTED` and list unresolved blockers because the absence of more rounds is not evidence of quality.
- You MUST preserve critiques and votes for auditability.
- You MUST present the final document path and run summary to the user.
- You SHOULD report advisories separately from blocking findings so accepted documents can retain non-blocking improvements.

## Examples

### Example 1: Random HLD evaluation

**Input:**
- topic: `random`
- document_type: `hld`
- random_seed: `redis-2026`

**Expected Behavior:**
The workflow selects a reproducible HLD scenario, researches primary sources, creates two independent candidates, revises against fresh critics, and requires unanimous panel acceptance.

### Example 2: Supplied LLD

**Input:**
- topic: `/absolute/path/idempotency-brief.md`
- document_type: `lld`
- max_revision_rounds: `3`

**Expected Behavior:**
The workflow treats supplied values as scenario constraints, verifies external claims, and reviews implementation contracts, state transitions, concurrency, failure handling, observability, and tests.

## Troubleshooting

### Subagents are unavailable

Hard stop and report that independent review cannot be executed. Do not collapse writer and judge roles into one context because self-review violates the workflow's independence requirement.

### Research sources disagree

Record the disagreement and source dates in the evidence pack. Treat the claim as uncertain unless one source is authoritative for the exact version or environment.

### The critic loop does not converge

Inspect whether a blocking finding requires a user decision, missing measurement, or incompatible requirements. Mark that dependency as unresolved and return `NOT_ACCEPTED` instead of rewriting around it.

### Panel JSON is malformed

Retry that judge once with the validator error and exact schema. If the second output is malformed, stop the panel round as invalid.
