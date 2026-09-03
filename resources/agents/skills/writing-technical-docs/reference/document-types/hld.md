# High-Level Design

## Purpose and altitude

An HLD asks which system-level architecture should be adopted and why. It establishes system boundaries, major components, responsibilities, interfaces, data and control flows, quality attributes, alternatives, and delivery consequences before implementation makes those choices expensive.

Write an HLD after the customer or business requirements are understood. If requirements are unclear, resolve them with stakeholders before selecting architecture.

Use an HLD when the design is ambiguous, cross-cutting, expensive to reverse, operationally material, or owned by several teams. Use a one-pager for a narrow direction and an LLD for implementation mechanics inside an already approved architecture.

The HLD should be detailed enough to justify architectural decisions but should not become a catalog of methods, complete schemas, raw configuration, or routine implementation steps.

## Progressive section routing

Read only the detail files needed for the current task:

| Section group | Read when | Reference |
|---|---|---|
| Decision, context, scope, requirements, and success criteria | Starting, restructuring, or reviewing the premise of any HLD | [hld-framing.md](hld-framing.md) |
| Current/proposed architecture, components, interfaces, data, diagrams, and alternatives | Drafting or reviewing the architectural core | [hld-architecture.md](hld-architecture.md) |
| Cross-cutting concerns, estimates, risks, rollout, review outcome, and appendices | Preparing the design for approval and delivery | [hld-delivery.md](hld-delivery.md) |

There is no default HLD format. Do not load all section prompts merely to reproduce them as headings. Select, merge, reorder, or replace sections according to audience questions, uncertainty, risk, and the decisions under review.

Each routed section is optional guidance for a reader question the document may need to answer. Its principle is normative when that question applies; its example demonstrates the reasoning move and must not be copied as domain evidence.

## Minimum reasoning flow

```text
decision and recommendation
-> customer/system problem
-> scope, requirements, constraints, and criteria
-> current architecture and its relevant limits
-> proposed architecture overview
-> component and interface decisions
-> alternatives evaluated against common criteria
-> security, reliability, operations, cost, and delivery consequences
-> risks, open questions, owners, and review outcome
```

The HLD may organize the design by runtime flow, phase, or component. Preserve the reasoning order even when the destination template uses a different heading order.

## Diagram contract

Include at least one system-context or component diagram and representative sequence diagrams when interactions determine the design. Every diagram must:

- Declare whether arrows represent calls, control, or data flow.
- Distinguish existing, changed, and new components.
- Define components in a legend or adjacent text before later prose depends on them.
- Have a caption stating the decision-relevant point.
- Remain understandable in the document without a verbal presentation.

## HLD review checks

- Requirements and success criteria can evaluate the architecture.
- The recommendation is visible before component detail.
- Current and proposed states use comparable boundaries and flow order.
- Each component has one clear responsibility and named interfaces.
- Architecture-significant schema or timing constraints are present; routine detail is linked or deferred.
- Alternatives include the status quo and strongest credible option.
- Security, privacy, availability, capacity, observability, cost, migration, and rollback are addressed where relevant.
- Open questions have owners and dates; the review outcome is preserved.

## Example dissections

### Small Vaults Phase 2 HLD

[Internal example](https://quip-amazon.com/bbNbAdMRlGyX)

The document mirrors current and proposed workflows in the same phase order, then examines affected systems, alternatives, thresholds, and follow-ups. That parallel structure makes the delta reviewable. Its late glossary is a pattern to improve: define terms at first use even when a glossary also exists.

### Phloem Design

[Principal Engineer recommended example](https://quip-amazon.com/zvJTAJ7AxOjp)

The document proves the intended customer capability with a concrete preview before descending into concepts, components, costs, and limits. This keeps the architecture tied to an observable outcome.

### Search Baristas

[Principal Engineer recommended example](https://w.amazon.com/bin/view/Search/Baiji/Projects/SearchBaristas/)

The design uses comparable current and future diagrams, explicit requirements, cross-system impact analysis, migration, rollback, capacity, and developer experience. It demonstrates that delivery and operations are part of architecture rather than appendices added after selection.

### Kubernetes KEP-753: Sidecar Containers

[Public proposal](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/753-sidecar-containers/README.md)

The proposal grounds motivation in concrete scenarios, bounds goals, specifies semantics, and follows the choice through compatibility, resource accounting, testing, graduation, rollback, version skew, and alternatives.

### Chromium Multi-process Architecture

[Public as-built architecture reference](https://www.chromium.org/developers/design-documents/multi-process-architecture)

The page starts with a failure model, defines browser and renderer terminology, and progressively exposes components and behavior. It is useful for explanation, but it is not a complete proposal model because it does not preserve alternatives, rollout, or a pending decision.

## Sources

- [Provided Amazon HLD template](https://quip-amazon.com/y0FuA0muip5z/High-Level-Design-Template)
- [Amazon Principal Engineer Design Guidance Resources](https://w.amazon.com/bin/view/Principal/Principal_Engineer_Design_Guidance/Resources/)
- [Amazon Design Document Guide](https://w.amazon.com/bin/view/DesignProcessFramework/DesignDocumentGuide/)
- [Amazon Glacier: Writing a High Level Design](https://w.amazon.com/bin/view/AWS/Glacier/Ops/Runbooks/WritingAHLD/)
- [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)
- [Kubernetes KEP template](https://github.com/kubernetes/enhancements/blob/master/keps/NNNN-kep-template/README.md)
