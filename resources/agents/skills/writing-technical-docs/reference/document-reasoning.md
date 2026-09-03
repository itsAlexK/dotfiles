# Document Reasoning and Idea Flow

Use this reference before drafting, restructuring, or substantively reviewing a technical document. It controls the argument underneath the prose.

## Decision frame

Complete this compact frame before outlining:

```text
Document type and status:
Decision or question:
Recommended answer:
Primary decider:
Affected readers and reviewers:
Decision date:
Why now:
Reader baseline:
Reader after-state:
Scope:
Non-scope:
```

Mark unknowns. Do not fill gaps with plausible-looking facts.

## Problem and criteria

Keep the problem independent of the preferred solution:

```text
Affected actor or system:
Current state:
Observable failure or opportunity:
Magnitude and evidence:
Facts:
Assumptions requiring validation:
Constraints:
Goals:
Non-goals:
Ranked decision criteria:
How each criterion will be measured:
```

A criterion must discriminate between options. "Scalable" is not a criterion until the document names a workload, growth factor, resource limit, or mechanism.

## Argument map

Build one row for each claim that could change the decision:

| Claim | Evidence | Warrant or criterion | Implication | Cost or qualifier | Strongest objection | Response | Confidence |
|---|---|---|---|---|---|---|---|

- **Claim:** what the document asks the reader to believe.
- **Evidence:** measured data, cited facts, code, logs, experiments, or a named mechanism.
- **Warrant:** why that evidence supports the claim under a declared criterion.
- **Implication:** what follows for the design or decision.
- **Cost or qualifier:** what is given up, what remains uncertain, or where the claim stops.
- **Objection and response:** the strongest credible counterargument, not an easy substitute.

Evidence without a warrant leaves the reader to infer why it matters. A warrant without evidence is an assertion.

## Alternative matrix

Compare the recommendation, the status quo, and the strongest credible alternative against the same criteria:

| Option | Mechanism | Criteria satisfied | Evidence | Benefits | Costs and risks | Reversibility | Disposition |
|---|---|---|---|---|---|---|---|

Do not include decorative alternatives whose only purpose is to make the recommendation look stronger. Record why each rejected option loses under the same decision rule.

## Term dependencies

Create a term ledger when the design has unfamiliar concepts, many components, or acronyms:

| Term | Definition or authoritative link | First needed in | Prerequisite terms | Stable name |
|---|---|---|---|---|

Apply these rules:

1. Expand an unfamiliar abbreviation on first use, then use one abbreviation consistently.
2. Define a custom component or concept before another term, heading, table, diagram, or claim depends on it.
3. Use the same name throughout. Do not rotate synonyms for variety.
4. Define terms locally near first need. Add a glossary when many terms also need a lookup index.
5. A diagram may introduce several components only when its legend or adjacent text defines them before the prose relies on them.
6. Avoid an abbreviation used only a few times; the full name costs less than the reader's lookup.

Perform a top-to-bottom first-use scan after drafting. Titles and summaries count as first use.

## Information order

Treat the outline as a dependency graph. Foundational facts and terms must precede claims that use them.

The default reasoning spine is:

```text
decision and recommendation
-> context and problem
-> goals, non-goals, constraints, and criteria
-> customer-visible behavior or architecture overview
-> design decisions with claim/evidence packets
-> alternatives and objections
-> operational consequences, costs, and risks
-> unresolved questions, owners, and action
```

Adapt the section names to the destination template. Preserve the dependency order even when headings differ.

Within the design:

- Explain purpose before procedure.
- Show the system boundary before internal components.
- Introduce a component before its interactions.
- Describe the normal path before edge cases, failure, recovery, and concurrency.
- State requirements and invariants before mechanisms that satisfy them.
- State evaluation criteria before comparing options.
- State the selected option before descending into its implementation.
- Put supporting depth after the decision-relevant claim it supports, or move it to an appendix.

## Section and paragraph transitions

Each section should answer a question created by the preceding section. Name the relation between adjacent sections: cause, consequence, contrast, dependency, narrowing, or exception. If no relation can be named, reorder or separate the material.

At paragraph level, prefer:

```text
claim -> evidence or mechanism -> implication -> tradeoff or qualification
```

This logical shape does not override the measured paragraph and sentence distribution in the prose profile.

## Opening and closing

The opening summary must stand on its own. A decider should find the request, recommendation, two or three reasons, principal cost, and unresolved decision without reading the body.

Do not withhold the recommendation to create suspense. The body earns a conclusion already visible at the start.

The document does not need a generic conclusion. Where a template requires an outcome or next-steps section, record the decision, strongest remaining uncertainty, owner, and dated action. Introduce no new term, claim, or evidence there.

## Reviewability checks

- Can the decider identify the ask, recommendation, and reasons in 60 seconds?
- Do the headings alone expose the argument?
- Does each section have a purpose and a prerequisite?
- Can every decision-relevant claim be traced to evidence and a warrant?
- Is every unfamiliar term defined before first dependency?
- Are facts, assumptions, proposals, decisions, and open questions distinguishable?
- Is the strongest alternative represented fairly?
- Are reversibility, dissent, rejected ideas, and unresolved questions visible?
- Could an informed engineer disagree with a specific premise instead of rejecting an opaque conclusion?

## Sources

- [Google Technical Writing: Audience](https://developers.google.com/tech-writing/one/audience)
- [Google Technical Writing: Words](https://developers.google.com/tech-writing/one/words)
- [Google Technical Writing: Paragraphs](https://developers.google.com/tech-writing/one/paragraphs)
- [Google Technical Writing: Documents](https://developers.google.com/tech-writing/one/documents)
- [Google Technical Writing: Large documents](https://developers.google.com/tech-writing/two/large-docs)
- [Purdue OWL: Toulmin argument](https://owl.purdue.edu/owl/general_writing/academic_writing/historical_perspectives_on_argumentation/toulmin_argument.html)
- [Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md)
- [PEP 1](https://peps.python.org/pep-0001/)
- [RFC 7322: RFC Style Guide](https://www.rfc-editor.org/rfc/rfc7322.html)

The worksheets and ordering rules above synthesize these sources. They are not copied from one source.
