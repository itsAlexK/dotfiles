# HLD Delivery and Cross-Cutting Sections

Use this guide to establish that the proposed architecture can be secured, operated, migrated, and delivered.

The examples are synthetic. Each demonstrates the minimum claim/evidence/consequence shape for its section.

## Cross-cutting concerns

**Principle:** Include a cross-cutting concern only when it changes a requirement, boundary, option, or residual risk.

Cover a concern when it creates a requirement, changes component boundaries, or could reverse an option:

- Security and trust boundaries
- Privacy and data classification
- Availability and recoverability
- Capacity and scalability
- Latency budgets
- Observability and operational ownership
- Cost and resource efficiency
- Accessibility, localization, or regional behavior
- Compliance and auditability

For each relevant concern, connect `requirement -> mechanism -> evidence -> residual risk`. Do not create empty boilerplate sections for irrelevant concerns.

**Good example:** "Tenant credentials authorize one key prefix and command set through managed RBAC. Separate cells provide the resource boundary; RBAC alone would not prevent cross-tenant memory eviction."

## Capacity and cost

**Principle:** Convert the workload into a topology and cost model before presenting a service or node count.

State the workload model, expected baseline and peak, growth horizon, bottleneck, scaling unit, quotas, and validation plan. Tie estimates to a source or scenario constraint.

Present cost as a comparison or budget consequence. Include engineering and operational burden when it differentiates options.

**Good example:** "The eligibility model calculates shards from per-tenant bytes per second, resident memory, connections, hot-key skew, one-zone failure headroom, and growth. Node count remains open until those inputs and the cost ceiling are supplied."

## Failure and recovery

**Principle:** For each credible failure, state detection, containment, customer effect, recovery, and residual loss.

Identify architecture-level failures:

- Component or dependency outage
- Region or availability-zone loss
- Backlog and overload
- Corrupt, delayed, duplicated, or out-of-order data
- Partial deployment or incompatible version
- Credential, quota, or control-plane failure

State detection, containment, degraded behavior, recovery owner, recovery time, data loss boundary, and customer effect.

**Good example:** "Loss of a shard primary triggers managed promotion. Clients may receive errors during promotion and topology refresh; the load test must measure this interval against the availability error budget and verify every acknowledged write against an external ledger."

## Migration and compatibility

**Principle:** Treat migration as a sequence of state-ownership changes with explicit compatibility and rollback boundaries.

Describe:

- Existing clients and data
- Compatibility window
- Dual-read, dual-write, shadow, or backfill phases
- Source-of-truth transitions
- Validation and reconciliation
- Cutover criteria
- Rollback point and one-way doors
- Cleanup and deprecation

A migration that changes state ownership is part of the architecture, not a launch footnote.

**Good example:** "Clients first gain dual-endpoint support. The team then shadows reads against an empty target, warms reconstructable keys from the source of truth, shifts 1% of tenants, and retains the old endpoint until no new-only writes require reverse transfer."

## Testing and validation

**Principle:** Test the premise most likely to reverse the design, with a pass condition that cannot be satisfied by a health signal alone.

Name the evidence required before implementation and launch:

- Prototype or benchmark for disputed premises
- Contract and integration testing
- Load and stress testing against the workload model
- Failure injection or recovery exercise
- Security and privacy review
- User acceptance or end-to-end validation

The HLD defines what must be proven. The LLD may define exact test cases and harnesses.

**Good example:** "The zone-loss test passes only if client-observed availability remains inside the 30-day error budget, surviving nodes remain below 70% measured capacity, and the acknowledgment ledger contains no missing write older than 60 seconds."

## Effort and sequencing

**Principle:** Estimate work streams and dependencies at the level needed to expose critical path and ownership, not false schedule precision.

Break work into architecture-level streams and identify dependencies, critical path, partner commitments, and uncertainty. Use ranges or team-native estimates with assumptions. Do not present precision unsupported by a work breakdown.

**Good example:** "Client compatibility and quota enforcement can proceed in parallel. Migration tooling starts only after the source-of-truth and rollback contracts close; this dependency is expected to control the launch date."

## Risks

**Principle:** Write a risk as a falsifiable failure condition with impact, mitigation, residual exposure, owner, and trigger.

Rank risks by likelihood and consequence. For each, state trigger, impact, mitigation, residual exposure, owner, and validation date. Include the strongest risk to the recommendation rather than only implementation risks.

**Good example:** "Risk: dedicated cells exceed the regional node quota before year two. Trigger: the forecast passes 80% of the approved quota. Mitigation: request quota early and test the gateway alternative; residual exposure remains if tenant growth outpaces both."

## Rollout and rollback

**Principle:** Define exposure, observation, stop, and reversal as operational actions tied to measured guardrails.

Describe staged exposure, guardrails, bake periods, success and stop criteria, observability, rollback mechanism, and cleanup. Name irreversible migrations and the last safe rollback point.

**Good example:** "Roll out to 1, 10, and 50 tenants with a 48-hour bake at each stage. Stop when p99 exceeds 5 ms for two windows or quota rejection affects another tenant; rollback remains safe until writes depend on target-only state."

## Open questions and review outcome

**Principle:** Separate unresolved evidence from decided architecture and preserve who must close each gap.

Each open question needs an owner, evidence required, and target date. Separate questions that block approval from those that can close during implementation.

After review, preserve:

- Decision and chosen option
- Decider and date
- Conditions of approval
- Dissent or rejected advice
- Action items
- Superseding document when later changed

**Good example:** "`Open Q4`: Can synchronous durability meet 5 ms p99? Owner: Performance Engineering. Evidence: production-shaped benchmark. Due: 2026-10-09. Outcome: architecture approval remains blocked until Q4 closes."

## Appendices

**Principle:** Move depth out of the reading path only after the body states the decision-relevant result.

Use appendices for raw benchmark output, exhaustive schemas, configuration, detailed requirement lists, calculations, and abandoned explorations. Keep the decisive result in the body.

**Good example:** "The body states that synchronous durability adds 1.8 ms p99 in the representative test. Appendix B contains the workload generator, raw percentiles, node metrics, and run identifiers."

## Delivery review checks

- Cross-cutting sections trace requirements to mechanisms.
- Capacity and cost use a stated workload model.
- Migration identifies source-of-truth transitions and rollback limits.
- Tests validate the premises most likely to reverse the design.
- Risks include owner, trigger, and residual exposure.
- Open questions distinguish approval blockers from implementation follow-ups.
- The review outcome preserves the point-in-time decision.

## Primary sources

- [Provided Amazon HLD template](https://quip-amazon.com/y0FuA0muip5z/High-Level-Design-Template)
- [Amazon Effective Design Review Format](https://w.amazon.com/bin/view/Principal/Principal_Engineer_Design_Guidance/Resources/EffectiveReviewFormat/)
- [Martin Fowler: Scaling Architecture Conversationally](https://martinfowler.com/articles/scaling-architecture-conversationally.html)
