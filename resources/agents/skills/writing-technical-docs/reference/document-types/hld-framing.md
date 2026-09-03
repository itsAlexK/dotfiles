# HLD Framing Sections

Use this guide for the front of an HLD. The purpose is to make the architectural decision and its premises explicit before showing the solution.

The examples are synthetic and intentionally short. They model the section's reasoning, while [prose-profile.md](../prose-profile.md) governs the complete document's voice.

## Metadata and review state

**Principle:** Establish who owns the decision, what state it is in, and when the information stops being current.

Include:

- Title and status (`Draft`, `In Review`, `Accepted`, `Superseded`)
- Author and design owner
- Primary decider
- Required reviewers and affected teams
- Created, last updated, and target decision dates
- Links to requirements, PRFAQ, one-pager, prior decisions, and superseding documents

Metadata should make authority and freshness visible without requiring document history archaeology.

**Good example:** `Status: In Review | Design owner: Cache Platform | Decider: Principal Engineer | Required reviewers: Security, SRE, Client Platform | Decision date: 2026-10-16 | Supersedes: Cache HLD v1`

## Executive summary

**Principle:** State the recommendation and its decision rule before asking the reader to absorb architecture.

State:

1. The customer or system problem.
2. The requested architectural decision.
3. The recommended architecture at one level of abstraction.
4. The two or three decisive reasons.
5. The principal downside or irreversible commitment.
6. The most important unresolved question.

Do not introduce a component name in the summary without a compact definition.

**Good example:** "This document proposes a managed, cell-based cache in which each tenant receives an isolated shard group. The design satisfies the resource-isolation requirement through separate node capacity, but it increases node count and remains conditional on the workload and cost gates in Validation."

## Context and current state

**Principle:** Include only existing behavior and history that constrain the new design.

Provide only history and existing-system behavior needed to understand the problem and constraints. Assume an informed engineer outside the immediate team has little local context.

When current architecture matters, use the same boundaries, component names, and runtime order later used for the proposed state. This turns the design into a reviewable delta instead of two unrelated descriptions.

**Good example:** "Three services currently share one cache process and distinguish data by key prefix. Memory eviction and connection limits apply to the process, so one service can evict another service's keys during a traffic spike."

## Problem statement

**Principle:** Make the problem independently true and measurable before presenting a solution.

Describe:

- The affected customer, operator, developer, or system
- The current behavior
- The observable failure or missed opportunity
- Magnitude, frequency, cost, or named mechanism
- Why the problem needs action now

The problem statement must remain valid if the proposed architecture is deleted from the document.

**Good example:** "A tenant with an unbounded import can consume the shared cache's memory and connections, increasing p99 latency for unrelated tenants. Two incidents in August required operators to flush the cache and refill it from the backing store."

## Scope and non-scope

**Principle:** Bound the decision so reviewers can distinguish an omitted requirement from intentionally deferred work.

Summarize the work required to satisfy the requirements in ordinary terms. Separate phases when later work changes the architecture or customer behavior.

List likely but excluded work as non-scope. Explain exclusions that affect a reviewer expectation, risk, or future migration.

**Good example:** "Phase 1 covers GET, SET, expiry, failover, and tenant quotas in one region. Cross-region replication and Redis modules are out of scope because no launch client requires them."

## Stakeholders and ownership

**Principle:** Separate advice, approval, implementation, dependency, and operational ownership.

Name customers, implementers, service owners, dependent teams, and external partners. Distinguish who advises, who approves, who implements, and who operates the result.

**Good example:** "Cache Platform owns the service and on-call. Client Platform owns library changes. Security approves the trust boundary, and the Payments team validates the acknowledged-write contract."

## Requirements and constraints

**Principle:** State the behavior and quality boundaries the architecture must satisfy before using them to justify a component or option.

**Good example:** "The service must isolate tenant capacity, survive one availability-zone loss, and preserve the acknowledged-write recovery bound. The architecture remains unapproved until each term has a measurement definition."

### Functional requirements

**Principle:** Express required observable behavior without prescribing an implementation unless the mechanism is itself a constraint.

Use stable identifiers and priority only when priority affects launch or design. Condense or link a long requirement inventory, but retain enough in the HLD to trace each major component and choice back to a requirement.

**Good example:** "`FR-3`: A tenant whose request or memory budget is exhausted must receive a tenant-scoped rejection without reducing another tenant's reserved capacity."

### Non-functional requirements

**Principle:** Give every quality claim a measurement boundary, workload, and threshold.

Quantify relevant dimensions:

- Latency percentiles and operation
- Request, message, or data volume
- Availability and durability
- Consistency
- Recovery time and recovery point
- Security and data classification
- Retention and privacy
- Cost ceiling
- Regional or marketplace constraints
- Growth factor and planning horizon

If a value is unknown, record the owner and validation plan. Do not replace it with an adjective.

**Good example:** "`NFR-2`: GET and SET requests must remain below 5 ms p99 over a 30-minute peak-load window, measured at the client and including TLS, routing, and retries."

## Goals, non-goals, and principles

**Principle:** Use goals to define success, non-goals to stop scope growth, and principles only to resolve real tradeoffs.

Goals define outcomes. Non-goals stop the design from absorbing adjacent work. Design principles explain why later tradeoffs favor one property over another.

Each principle must resolve a real tension, such as prioritizing bounded recovery time over immediate cross-region consistency. Avoid generic principles that every design would claim.

**Good example:** "The design prioritizes enforceable tenant isolation over packing efficiency. It does not provide cross-region availability, and it accepts reconstructing cache contents after total regional loss."

## Success metrics

**Principle:** State how the team will know the system solved the original problem after launch.

State the business and technical measurements that determine whether the architecture solved the problem. Name the source, calculation, baseline, target, measurement window, and owner where available.

Separate launch guardrails from long-term success metrics.

**Good example:** "The launch guardrail is zero cross-tenant quota breaches during fault testing. The 30-day success metric is a 75% reduction in cache-related pages, measured from the on-call incident taxonomy."

## Customer or user experience

**Principle:** Describe visible success and failure behavior where it creates architectural requirements.

Describe customer-visible flows, success behavior, errors, timeouts, and recovery where they affect architecture. Use mocks or examples when an interface determines requirements. Do not invent experience details that product owners have not approved.

**Good example:** "A client that exceeds its write budget receives `TENANT_RATE_LIMITED` with a retry delay. Requests from other tenants continue against their reserved budgets and do not share that retry delay."

## Framing review checks

- The decision is explicit and belongs at HLD altitude.
- The problem is solution-independent and evidenced.
- Terms are introduced before later sections depend on them.
- Requirements and criteria can distinguish options.
- Scope and non-scope close predictable ambiguity.
- Ownership includes implementation and operations.
- Missing measurements are open questions with owners, not hidden assumptions.

## Primary sources

- [Provided Amazon HLD template](https://quip-amazon.com/y0FuA0muip5z/High-Level-Design-Template)
- [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)
