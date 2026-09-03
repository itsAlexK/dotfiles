# Technical Document Review Rubric

Use this rubric for isolated critics and final panel judges. Review the document against its stated type, audience, and decision rather than against a favorite generic template.

## Dimensions

Score every dimension from 1 to 5:

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Decision clarity | Ask or recommendation is absent | Decision is visible but incomplete | Ask, recommendation, owner, timing, scope, and principal cost are immediately clear |
| Argument and flow | Sections are an inventory | Main reasoning exists with gaps | Ideas are dependency-ordered and every major conclusion follows from explicit premises |
| Evidence and correctness | Material claims are unsupported or wrong | Most claims have support, with unresolved gaps | Claims are source-backed or mechanically justified, assumptions are labeled, and no known contradiction remains |
| Alternatives and tradeoffs | No credible alternative or cost | Alternatives exist but comparison is uneven | Status quo and strongest alternative use common criteria; costs, risks, and reversibility are local and fair |
| Document fit | Wrong altitude or audience | Mostly fits the type with excess or missing depth | Scope, sections, diagrams, and detail precisely serve the document's decision |
| Prose and terms | Terms appear before definition; prose blocks comprehension | Understandable with several style deviations | Terms are defined before dependency and prose follows the user's measured profile without obscuring content |

A score of `4` means the dimension is decision-ready with only non-blocking improvements. A score of `5` should be uncommon.

## Finding severity

- **Critical:** a false claim, unsafe design, missing decision premise, contradictory requirement, or flaw that could reverse the decision.
- **Major:** a reasoning, evidence, scope, or implementation gap that prevents informed acceptance.
- **Advisory:** a useful improvement that does not block the decision.

Critical and major findings are blocking. Each blocking finding must name a location, explain the consequence, and state the evidence or change needed to resolve it. Judges must not rewrite the document.

## Request fidelity

The document must answer the type and decision in the approved brief. Flexible section selection does not permit changing an HLD into a one-pager, a PRFAQ into an architecture proposal, or a requested decision into approval of further research. A writer may produce a conditional draft or report that required evidence is missing. Changing the deliverable or decision requires explicit user approval and an updated brief.

A document that substitutes another decision receives `1` for document fit and cannot be accepted.

## Critic readiness

The iterative critic may return `READY_FOR_PANEL` only when:

- No critical or major finding remains.
- Every dimension scores at least `4`.
- Every consequential claim is supported or explicitly marked as an assumption or open question.
- The document can be evaluated without consulting a later definition for an earlier term.

## Panel acceptance

The panel accepts only when:

- The argument, technical, and document/style judges all vote `ACCEPT`.
- Every judge scores every dimension at least the configured threshold, normally `4`.
- No judge reports a blocking finding.
- `scripts/check_style.py` exits `0`.

Panel judges work independently and do not see other votes before submitting their own.

## Panel review schema

Each panel judge writes one JSON file:

```json
{
  "judge_role": "argument",
  "verdict": "ACCEPT",
  "scores": {
    "decision_clarity": 4,
    "argument_and_flow": 4,
    "evidence_and_correctness": 4,
    "alternatives_and_tradeoffs": 4,
    "document_fit": 4,
    "prose_and_terms": 4
  },
  "blocking_findings": [],
  "advisories": [
    {
      "location": "Risks",
      "problem": "The capacity risk could cite the load-test artifact.",
      "suggested_change": "Add the existing benchmark link."
    }
  ],
  "summary": "The document is sufficient for the stated decision."
}
```

Valid roles are `argument`, `technical`, and `document`. A judge voting `REVISE` must provide at least one blocking finding.

Every blocking finding uses this exact shape:

```json
{
  "location": "Alternatives",
  "problem": "The status quo is not evaluated against the stated criteria.",
  "required_change": "Add the status quo to the common comparison and state its disposition."
}
```

Use `required_change` for blockers. Reserve `suggested_change` for non-blocking advisories; the panel aggregator rejects a blocking finding that uses the advisory field.
