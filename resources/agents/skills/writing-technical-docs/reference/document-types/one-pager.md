# Technical One-Pager

## Purpose

A technical one-pager asks whether a narrow direction is worth pursuing, testing, or expanding into a full design. It gives a decider enough context and evidence for that decision without paying the reading cost of a high-level design (HLD).

Use it when:

- The problem and direction can be evaluated without component-level design.
- The next action is a prototype, deeper design, resourcing decision, or limited approval.
- The decision is bounded, reversible, or still early.

Do not use it to hide architectural complexity. Escalate to an HLD when the proposal crosses several systems, has material security or operational risk, or requires several coupled decisions.

## Reader contract

An informed reader outside the immediate team should understand within one page:

1. What decision is requested?
2. What fails or becomes possible today?
3. What direction is recommended?
4. Why does it win under the stated criteria?
5. What does it cost, what remains unknown, and what happens next?

Treat "one page" as a prioritization constraint. Link detailed evidence or add a clearly optional appendix; do not shrink the type or compress an HLD into unreadable prose.

The examples below are synthetic. They demonstrate the reasoning move for a section, not the full sentence-length distribution required by the prose profile.

## Section map

This map describes information the decision commonly needs, not mandatory headings. Combine, rename, reorder, or omit entries when the resulting page answers the reader's questions more directly.

### Metadata

**Principle:** Make ownership, maturity, and the exact decision boundary visible before the narrative starts.

Name the owner, status, decider, reviewers, and target decision date. Metadata distinguishes a proposal from an adopted decision.

**Good example:** `Status: Draft | Owner: Metrics Platform | Decider: Data Platform SDM | Decision date: 2026-10-02 | Ask: approve a two-week event-trigger prototype`

### Decision and recommendation

**Principle:** Lead with the decision and recommendation so the reader knows what the remaining evidence must establish.

Open with the requested decision and recommended direction. Include the two or three decisive reasons, the principal downside, and whether the choice is reversible.

**Good example:** "We propose a two-week prototype that starts the daily metrics job from the source manifest event. This removes up to 90 minutes of idle wait, but it adds duplicate-event handling and does not yet approve the production migration."

### Problem and current state

**Principle:** Describe an observable failure without embedding the preferred solution in the problem.

Describe the affected actor or system, observable failure or opportunity, magnitude, and why action is needed now. Define unfamiliar terms at first use. Do not introduce the preferred solution as if it were part of the problem.

**Good example:** "The job starts at 02:00 UTC even though the source publishes between 01:20 and 03:30. Early days spend up to 40 minutes waiting on a poll, while late days fail and require an operator restart."

### Goals, non-goals, and criteria

**Principle:** Turn desired outcomes and constraints into criteria that can reject an option.

State the outcome, boundaries, and ranked criteria that will distinguish options. Use only criteria that affect the recommendation.

**Good example:** "The trigger must start within 5 minutes of a complete manifest, tolerate duplicate delivery, and preserve one daily output. Rewriting the transformation job is out of scope."

### Proposed direction

**Principle:** Explain only enough mechanism to establish feasibility and the decision-relevant delta.

Explain what changes at the level needed for the decision. A small context or flow diagram is useful when prose would make the boundary ambiguous. Avoid class, schema, and deployment detail unless it determines feasibility.

**Good example:** "The source publishes a versioned manifest event after the final object is visible. A trigger service records the manifest identifier, rejects a duplicate identifier, and starts the unchanged metrics job."

### Alternatives and tradeoffs

**Principle:** Compare the status quo and strongest alternative against the same criteria, including each option's real cost.

Compare the proposal, status quo, and strongest credible alternative using the same criteria. State the evidence, downside, reversibility, and reason for disposition.

**Good example:** "Keeping cron has no migration cost but retains the 90-minute timing mismatch. Polling every 5 minutes meets the start-time goal, although it creates 288 checks per day and still needs completion detection."

### Risks, dependencies, and next step

**Principle:** End with the uncertainty that could reverse the direction and the smallest action that resolves it.

Name the most likely reason the proposal could fail, external dependencies, unresolved assumptions, and the next experiment or design artifact. Give the owner and expected decision point.

**Good example:** "The source may emit before every object is readable. Metrics Platform will replay 30 historical publications in a test account and will proceed to an HLD only if no run starts from an incomplete manifest."

## Review checks

- The ask and recommendation appear before background detail.
- The proposal is narrow enough for one page.
- The problem remains valid if the preferred solution is removed.
- The criteria explain why the recommendation beats the alternatives.
- At least one real downside and one unresolved assumption are visible.
- The next step is proportionate: test, HLD, LLD, approval, or stop.
- Appendices provide depth but do not carry a missing premise.

## Example dissections

### Crossplane Function Runner Capability Advertisement

[Real one-pager](https://github.com/crossplane/crossplane/blob/main/design/one-pager-function-capabilities.md)

The document isolates one compatibility failure, proposes an exact protocol change, demonstrates the intended interaction, and rejects four alternatives by mechanism. Its narrow boundary makes the decision possible without a full implementation design.

### Basecamp Shape Up Pitch

[Adjacent public guidance and examples](https://basecamp.com/shapeup/1.5-chapter-06)

`Problem`, `Appetite`, `Solution`, `Rabbit holes`, and `No-gos` force a bounded proposal and explicit implementation latitude. A technical one-pager should add alternatives, evidence, and operational risk because the pitch format does not require them.

## Sources

- [Crossplane design process](https://github.com/crossplane/crossplane/blob/main/design/README.md)
- [MADR: Markdown Architectural Decision Records](https://adr.github.io/madr/)
