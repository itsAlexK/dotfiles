# HLD Architecture Sections

Use this guide for the architectural core: current state, proposed system, components, interfaces, data, runtime flows, and alternatives.

The examples are synthetic and show the argument each section should make. They are not templates to copy verbatim.

## Current architecture

**Principle:** Explain the existing system through the boundaries and failure mechanisms that the proposed design will change.

Describe only the parts of the existing system that create constraints or change. Include:

- System boundary and external actors
- Relevant components and ownership
- Current data and control flows
- Interfaces and dependencies
- Measured bottlenecks, failure modes, or operational cost

Do not turn the section into a complete service catalog.

**Good example:** "Clients resolve one shared endpoint and send requests to a three-node cache. The cache has one process-wide memory ceiling, so tenant prefixes separate names but do not reserve memory, connections, or command capacity."

## Proposed architecture overview

**Principle:** Give the reader one complete normal-path model before decomposing individual decisions.

Start with a context or component diagram and one narrative pass through the normal path. Define each new or changed component, its responsibility, and why it exists before descending into individual decisions.

Mark what remains unchanged. A reader should be able to compare current and proposed architecture without inferring the delta.

**Good example:** "The proposed service assigns each tenant to a cell containing an endpoint, one or more shards, and cross-zone replicas. The client library discovers shard ownership from the endpoint and sends data operations directly to the owning primary."

## Runtime flows

**Principle:** Show behavior in causal order and add failure paths only after the normal contract is clear.

Use sequence diagrams or numbered flows for the interactions that justify the architecture:

1. Normal success path
2. Validation and rejection
3. Dependency timeout or partial failure
4. Retry, idempotency, and duplicate delivery
5. Recovery, failover, or replay

At HLD altitude, show responsibilities and guarantees. Defer method-level control flow to the LLD.

**Good example:** "`SET`: (1) the client resolves the key's shard, (2) the primary commits the write under the selected durability mode and (3) the client records success only after the service acknowledges it. A timeout after step 2 is an ambiguous outcome and follows the idempotency policy."

## Components

**Principle:** Give every component one accountable responsibility and explain why the boundary exists.

For each architecture-significant component, state:

- Responsibility and explicit non-responsibility
- Owner and lifecycle
- Inputs, outputs, and interfaces
- State held and source of truth
- Scaling unit and expected load
- Failure behavior and dependency effect
- Security or trust boundary
- Reason it is separate from adjacent components

Group minor components when a separate subsection would not change a decision.

**Good example:** "`Cell Manager` is responsible for tenant-to-cell assignment and quota configuration. It does not proxy data requests, which keeps management-plane failure outside the steady-state data path."

## Interfaces and dependencies

**Principle:** Describe the guarantees and failure ownership at a boundary, not only its protocol and fields.

Name protocols, ownership, compatibility expectations, quotas, latency budgets, availability assumptions, and onboarding work for dependencies. Record whether the dependency owner has reviewed the design.

Do not copy complete API definitions into the HLD. Include the contract elements that determine architecture and link the detailed specification.

**Good example:** "The client library uses TLS and a cluster-aware protocol. It refreshes topology after `MOVED`, caps redirection attempts at two, and reports an ambiguous mutation when the transport closes after write dispatch."

## Data architecture

**Principle:** Make state ownership, consistency, lifecycle, and recovery explicit before discussing schema shape.

Describe architecture-significant:

- Sources of truth and derived state
- Data ownership and lifecycle
- Partitioning and access patterns
- Consistency and ordering
- Retention, classification, encryption, and deletion
- Replication and recovery
- Schema compatibility and migration

Use representative schemas only when fields, keys, or cardinality determine the system choice. Move exhaustive schemas to the LLD or appendix.

**Good example:** "The backing database remains the source of truth. Cache keys are derived state with a 24-hour maximum lifetime, and a cell may be discarded only after the refill path has passed the source-capacity gate."

## Infrastructure and deployment

**Principle:** Select infrastructure from requirements and failure domains, then state the operational cost of that selection.

Explain the compute, storage, network, regional, and isolation choices that affect cost, scale, recovery, or ownership. Compare viable platforms using the declared criteria and measured evidence where available.

Avoid naming a service merely because it is familiar. State the requirement or mechanism that makes it fit.

**Good example:** "A managed cluster is preferred because automatic node replacement and cross-zone promotion remove host lifecycle from the team. This does not remove client retry, shard sizing, quota, or failure-test ownership."

## Alternatives

**Principle:** Give the strongest competing option enough mechanism and evidence that it could win.

For each major decision:

1. State the criteria and their priority.
2. Include the status quo and strongest credible alternative.
3. Compare the options on the same dimensions.
4. State the recommendation.
5. Name the downside and reversibility.
6. Record evidence needed to validate a weak premise.

Prototype or benchmark when a disputed performance, compatibility, or operational claim could reverse the decision.

**Good example:** "A shared cluster with a tenant-aware gateway improves packing efficiency. It remains rejected unless the gateway prevents bypass and enforces memory, connection, and request budgets before shared cache resources are consumed."

## Architecture review checks

- The overview precedes component detail.
- Component names and responsibilities remain stable.
- Diagrams declare arrow semantics and identify deltas.
- Every component traces to a requirement or constraint.
- Every interface names ownership and failure behavior.
- Data and consistency guarantees are explicit.
- Options are comparable and the recommendation follows from declared criteria.
- Detail exists because it changes architecture, not because it is available.

## Primary sources

- [Provided Amazon HLD template](https://quip-amazon.com/y0FuA0muip5z/High-Level-Design-Template)
- [Amazon Principal Engineer Design Guidance Resources](https://w.amazon.com/bin/view/Principal/Principal_Engineer_Design_Guidance/Resources/)
- [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/)
