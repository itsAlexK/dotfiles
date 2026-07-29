---
name: writing-technical-docs
description: Writes technical design documents, architecture proposals, and analysis docs in the user's own prose voice. Enforces a measured style profile - dense, evidence-backed, to-the-point prose with no em-dashes, quantified claims, volunteered tradeoffs, and enumerated parentheticals. Use when drafting or revising a design doc, HLD, RFC, technical proposal, architecture review, one-pager, or any technical writing that should read as the user wrote it. Also use when the user asks to rewrite existing prose in their voice or to check a draft against their style.
---

# Writing Technical Docs

Write technical prose in the user's voice. The voice is dry, dense, and to the point: every claim is backed by a figure or a named mechanism, costs are volunteered rather than buried, and nothing is asserted that a reader could not verify.

The full profile is in [reference/prose-profile.md](reference/prose-profile.md). Read it before drafting. It was derived from ~27,000 words of the user's design docs and every numeric target in it is measured, not estimated.

## Workflow

Copy this checklist and track progress:

```
- [ ] Step 1: Read reference/prose-profile.md
- [ ] Step 2: Gather the technical substance
- [ ] Step 3: Draft
- [ ] Step 4: Run scripts/check_style.py
- [ ] Step 5: Fix real deviations, re-run, repeat until clean
```

**Step 1: Read the profile.** Do not draft from this file alone. The profile carries the rules that matter.

**Step 2: Gather substance before prose.** This voice cannot be faked over thin material, because it demands a figure or a named mechanism per claim. Collect real parameter values, benchmark numbers, cost comparisons, version numbers, and named components first. Where a number is not available, find the mechanical reason a thing holds. Never invent a figure.

**Step 3: Draft.** Follow the profile. Write the document once, straight through, at the substance you gathered.

**Step 4: Validate.**

```bash
python3 scripts/check_style.py path/to/draft.md          # full measurement table
python3 scripts/check_style.py path/to/draft.md --quiet   # failures only
```

The script separates two severities. **Hard failures** (exit 1) are rules the corpus never breaks: em-dashes, banned tokens, second person, RFC-style uppercase modals, zero exemplifiers, a runaway sentence past 70 words. **Band deviations** (exit 0) are properties outside the corpus range; in a short document a few are acceptable, but fix any that describe spread or uniformity, because those are what make prose read as generated.

Every threshold is calibrated so all six of the author's own documents pass. If the script fails a passage you believe is right, check the threshold before rewriting the prose.

**Step 5: Fix and re-run.** Fix the hard failures, review the band deviations, run again. Repeat until it exits 0. Do not fix a variance deviation by flattening something else: raising `such as` by chopping long sentences trades one failure for another.

## The five rules that matter most

Everything else is in the profile. These five account for most failures:

1. **Zero em-dashes.** Not rare, absent: 0 occurrences in 27,000 words. Use a parenthesis, a `For example` sentence, or a comma-bound clause.
2. **Every claim gets a figure or a mechanism.** `$13,800 per month vs $800 for Glue` and `42 days to complete the backfill` buy decisions. Never assert that something is fast, scalable, or reliable without the number or the reason.
3. **Discharge abstractions with `For example` and `such as`,** followed by a named instance. Roughly one exemplifier per 250 words. Zero occurrences of both is a hard failure.
4. **Volunteer the cost.** Name what is given up in the same paragraph as what is gained. Record reversibility (`one-way door`).
5. **Do not over-fire the signature idioms.** `rather than` sits at 0.36 per 1,000 words in the corpus. A writer told an idiom is characteristic will use it five to ten times too often, and that is the single most common way this voice is given away.

## Failure modes

These are observed failures from testing the profile on unfamiliar technical subjects, not hypotheses. Each one passed every other check at the time.

**Metronomic paragraphs.** Satisfying "vary paragraph length" by making every paragraph 3-4 sentences. The user's median paragraph is 2 sentences and about 28% are a single sentence, often a stem introducing a list or table.

**Oscillating rhythm.** Matching the sentence-length histogram while alternating short-long-short. Adjacent sentences differ by about 10 words on average; regular alternation is as detectable as uniform length.

**Spec-digest density.** Reciting a specification's constants because the profile rewards numbers. More than two named constants with values in one sentence is a failure even when every value is correct. Move constant tables out of prose into an actual table.

**Encyclopedia voice.** Describing a system correctly while choosing nothing. The user writes as a proposer: naming options, picking one, saying why, and leaving at least one claim explicitly unresolved. Calibrated hedges (`would`, `should`, `is expected to`, `somewhat mitigated`) are load-bearing, not padding.

**Over-polish.** The corpus sprawls, repeats its connectives, and trails off. Prose with no loose ends reads as generated.

## Scope

The profile describes mechanics, not subject matter. It transfers to any technical domain: network protocols, storage engines, compilers, kernel internals, distributed systems. It was derived from documents about data platforms and financial systems, and none of that vocabulary belongs in output on another subject.

Markdown layout is out of scope. Headers, tables, and diagrams follow whatever template the destination requires. The profile governs running prose only.
