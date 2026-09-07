---
name: writing-technical-docs
description: Plans, drafts, restructures, and reviews technical decision documents in the user's measured prose voice. Use for one-pagers, high-level designs (HLDs), low-level designs (LLDs), Press Release/Frequently Asked Questions documents (PRFAQs), requests for comments (RFCs), architecture proposals, design reviews, and analysis docs, including requests to organize an argument, improve idea flow, introduce terms, choose a document type, run writer/reviewer loops, or rewrite/check prose in the user's voice. Builds an evidence-backed argument before drafting, routes to document-specific guidance, and validates the final prose.
---

# Writing Technical Docs

Treat a technical document as a tool for reaching and preserving a decision. Correct sentence mechanics cannot rescue an argument whose problem, criteria, evidence, or tradeoffs are missing.

The skill has three layers, in this order:

1. **Reasoning:** establish the decision, audience, idea dependencies, evidence, and argument.
2. **Document form:** disclose the argument at the altitude expected for the selected document type.
3. **Prose:** express it in the user's measured voice and run the style checker.

## Source precedence

Apply guidance in this order when two sources conflict:

1. The user's requested destination template and explicit instructions
2. Verified facts, requirements, and constraints for the design
3. The relevant document-type reference in this skill
4. [document-reasoning.md](reference/document-reasoning.md) and [clear-writing.md](reference/clear-writing.md)
5. [prose-profile.md](reference/prose-profile.md) for sentence-level voice
6. External examples, which are evidence of useful patterns rather than templates to copy

The prose profile overrides generic stylistic advice. For example, generic advice to make every sentence short does not replace the measured sentence-length distribution, and generic advice to remove every hedge does not replace calibrated uncertainty.

## Reference routing

Read only the references needed for the task.

| Task | Required references |
|---|---|
| Draft, restructure, or substantive review | [document-reasoning.md](reference/document-reasoning.md), [clear-writing.md](reference/clear-writing.md), and [prose-profile.md](reference/prose-profile.md) |
| Line edit or voice check only | [clear-writing.md](reference/clear-writing.md) and [prose-profile.md](reference/prose-profile.md) |
| Decide whether, when, or how to review a design doc | [design-doc-philosophy.md](reference/design-doc-philosophy.md) |
| Technical one-pager | [one-pager.md](reference/document-types/one-pager.md) |
| High-level design | [hld.md](reference/document-types/hld.md), then only the HLD section guides it routes to |
| Press Release/Frequently Asked Questions (PRFAQ) / Working Backwards | [prfaq.md](reference/document-types/prfaq.md), then [prfaq-sections.md](reference/document-types/prfaq-sections.md) when drafting |
| Low-level design | [lld.md](reference/document-types/lld.md), then only the LLD section guides it routes to |
| Multi-writer review or panel acceptance | [iterative-technical-doc-review.sop.md](agent-sops/iterative-technical-doc-review.sop.md) and [review-rubric.md](reference/review-rubric.md) |

A request for comments (RFC) is organization-specific. Classify it by the decision it must enable, then use the closest document-type reference while preserving the destination RFC template.

## Section selection

Do not begin by copying a complete template. Begin with the questions the actual readers must answer:

| Reader question | Decision or risk it affects | Evidence needed | Best placement |
|---|---|---|---|

Create, merge, reorder, or omit sections from that map. A section belongs only when it does at least one of these:

- Establishes a premise needed by a later decision
- Defines a term, boundary, requirement, or invariant
- Presents evidence that can change the recommendation
- Compares a credible option or exposes a material tradeoff
- Makes implementation, operation, migration, or review ownership unambiguous

Required information does not imply required headings. A small design may combine context, problem, and scope; a runtime-oriented design may organize its body by flows instead of components; a storage design may need data and migration depth that a stateless design omits. Follow a mandated destination template when one exists, but do not add empty boilerplate to simulate completeness.

Adapt the section structure, not the requested deliverable or decision. If missing facts prevent a defensible HLD, PRFAQ, one-pager, or LLD, surface those blockers and ask for the facts or return a conditional draft. Do not silently replace an architecture decision with approval of a research plan.

## Document selection

| Type | Decision it should enable |
|---|---|
| PRFAQ | Is the customer outcome valuable and viable enough to fund? |
| One-pager | Is this narrow technical direction worth pursuing or designing further? |
| HLD | Which system-level architecture should be adopted, and why? |
| LLD | How will an approved component be implemented and verified? |

These documents are not mandatory stages in one pipeline. Use the smallest form that exposes the important uncertainty and gives the actual decider enough evidence.

## Workflow

Track this checklist:

```text
- [ ] 1. Classify the document and decision
- [ ] 2. Read the routed references
- [ ] 3. Gather facts and separate assumptions
- [ ] 4. Build the decision frame, term map, and argument map
- [ ] 5. Outline by idea dependency
- [ ] 6. Draft at the selected document altitude
- [ ] 7. Review reasoning, flow, terms, and document fit
- [ ] 8. Apply the prose profile
- [ ] 9. Run scripts/check_style.py and fix real deviations
```

### 1. Classify the document and decision

Write one sentence for each of these before choosing sections:

- Decision or approval requested
- Recommended answer, if one exists
- Primary decider and affected readers
- Why the decision is needed now
- Scope and non-scope
- Evidence the reader must trust

If the user provides a template, retain its required headings. Omit optional sections that do not affect the decision, and record the reason when omission may surprise a reviewer.

### 2. Read the routed references

Do not load every document-type guide. Read the shared reasoning, clear writing, and prose references, then the selected type and only its relevant detail files.

Each document-type section guide is a menu of possible reader questions, not a default outline. It provides a principle and a synthetic good example for sections that the document actually needs. Apply the principle to the decision and use the example to understand the reasoning move. Do not copy its nouns, numbers, or section merely because it exists.

### 3. Gather facts before prose

Collect real parameter values, benchmark results, costs, version numbers, requirements, operational limits, and named mechanisms. Label user-provided or scenario constraints separately from externally verified facts. Never invent a figure to make an argument look complete.

For a document about a real technology such as Redis, prefer primary documentation, source code, specifications, and published papers. Record source links beside the claims they support.

### 4. Build the reasoning artifacts

Use the worksheets in [document-reasoning.md](reference/document-reasoning.md). At minimum:

- Derive evaluation criteria from goals, constraints, and non-goals.
- Compare the recommendation, status quo, and strongest credible alternative against the same criteria.
- Build each decision-relevant argument as `claim -> evidence -> warrant -> implication`, then add the strongest objection, response, cost, and uncertainty.
- List term dependencies so every unfamiliar term is defined before a heading, diagram, table, or claim relies on it.

A glossary is a lookup aid, not permission to use unexplained terms earlier in the document.

### 5. Outline by idea dependency

Put the decision and ask in the opening summary. The body should then earn the recommendation:

```text
context and problem
-> goals, non-goals, constraints, and criteria
-> externally visible behavior or architecture overview
-> design decisions and supporting evidence
-> alternatives and tradeoffs
-> operational consequences, risks, and rollout
-> open questions, owners, and review outcome
```

This is a reasoning spine, not a mandatory heading list. Each section must establish facts or terms needed by the next. Move deep evidence, raw schemas, exhaustive configuration, and abandoned explorations to an appendix or linked artifact.

### 6. Draft at the selected altitude

Start with the overview, then descend only where a decision depends on detail. Define a component before describing interactions with it. Describe the normal path before failure and recovery paths. Keep comparable options parallel enough that a reader can evaluate them on the same dimensions.

### 7. Review the argument before polishing it

Run these passes in order:

1. **Decision pass:** the ask, recommendation, owner, and deadline are visible.
2. **Dependency pass:** terms, facts, and criteria appear before dependent claims.
3. **Evidence pass:** every consequential claim has data, a source, or a named mechanism.
4. **Alternatives pass:** the status quo and strongest alternative receive fair treatment.
5. **Cost pass:** tradeoffs, reversibility, migration, and operational burden are local to the claimed benefits.
6. **Reader pass:** headings alone expose the argument and appendices contain only non-essential depth.

Do not use a generic conclusion to repeat the document. The opening summary carries the recommendation; a required outcome or next-steps section records the decision, remaining uncertainty, owner, and action without introducing new evidence.

### 8. Apply the prose profile

Read [prose-profile.md](reference/prose-profile.md) before drafting or rewriting. Its measured rules govern the user's sentence architecture, evidence density, stance, vocabulary, and punctuation.

### 9. Validate

```bash
python3 scripts/check_style.py path/to/draft.md
python3 scripts/check_style.py path/to/draft.md --quiet
```

Fix hard failures. Review band deviations in context, especially deviations describing spread or uniformity, then re-run until the checker exits `0`. The checker validates prose mechanics; it does not replace the reasoning passes above.

## Rigorous review mode

When the user asks for writers, critics, repeated revision, or panel acceptance, execute [iterative-technical-doc-review.sop.md](agent-sops/iterative-technical-doc-review.sop.md). That workflow:

1. Creates a sourced design brief.
2. Produces two independent candidate drafts.
3. Uses an isolated critic for revision rounds.
4. Runs the deterministic style checker.
5. Dispatches independent argument, technical, and document/style judges.
6. Accepts only when the panel is unanimous, every rubric dimension meets threshold, no blocking finding remains, and the style check passes.

The workflow has finite revision limits. If it exhausts them, return the best draft with unresolved blockers and do not call it accepted.
