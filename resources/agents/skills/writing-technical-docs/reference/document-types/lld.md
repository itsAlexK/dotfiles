# Low-Level Design

## Purpose and altitude

An LLD converts an accepted architecture into component contracts and behavior detailed enough for engineers to implement, test, operate, and review without making significant hidden design choices.

Write it after HLD decisions stabilize and before implementing a risky, complex, or shared component. Split a large solution by cohesive component or subsystem. Omit the LLD when implementation is straightforward and existing contracts, patterns, and code make the design unambiguous.

An LLD is not:

- A repetition of the business case or entire HLD
- An inventory of every class and method
- A copy of generated API or schema output
- A substitute for tests, interface definitions, or source code

## Progressive section routing

| Section group | Read when | Reference |
|---|---|---|
| Inherited decisions, modules, interfaces, schemas, invariants, workflows, failures, and concurrency | Drafting implementation behavior and contracts | [lld-contracts.md](lld-contracts.md) |
| Quality budgets, security, observability, testing, migration, launch, rollback, and work breakdown | Making the implementation verifiable and operable | [lld-delivery.md](lld-delivery.md) |

There is no default LLD format. Load only the relevant prompts, and organize the document around the implementation decisions that remain. A component without persistent data does not need a schema section; a synchronous stateless change may not need recovery-state design.

Each routed section is optional guidance for a question that may arise. When it applies, reuse the principle and argument shape, not the example's entities, values, or implementation choice.

## Minimum reasoning flow

```text
HLD decision and inherited invariants
-> component scope and responsibilities
-> public contracts and data model
-> normal behavior and state transitions
-> validation, errors, concurrency, retries, and recovery
-> quality budgets and security
-> observability and test mapping
-> migration, launch, rollback, and work breakdown
```

## Traceability

Each implementation-significant requirement should map to:

1. A contract, invariant, or mechanism
2. A test or validation method
3. An operational signal where runtime failure is possible

Use stable requirement and decision identifiers when the design is large enough to make prose-only traceability ambiguous.

## LLD review checks

- The HLD link and inherited decisions are explicit.
- Component scope prevents overlapping ownership.
- Interfaces specify validation, errors, compatibility, idempotency, and authorization where relevant.
- Data structures state invariants and migrations, not only fields.
- Normal, failure, timeout, retry, duplicate, concurrency, startup, and shutdown behavior are covered where relevant.
- Novel algorithms name complexity and resource bounds.
- Tests trace to requirements and failure modes.
- Launch and rollback respect state and compatibility constraints.
- Detail can be verified in code, tests, schemas, or operations.

## Example dissections

### status.arc42.org

[Building-block view](https://examples.arc42.org/systems/status.arc42.org/05-building-block-view/) and [runtime view](https://examples.arc42.org/systems/status.arc42.org/06-runtime-view/)

Responsibilities map to source packages and storage tables, while runtime scenarios specify startup, persistence, concurrency, retries, and timing without cataloging every function.

### NASA detailed-design guidance

[SWE-058](https://swehb.nasa.gov/spaces/7150/pages/16450603/SWE-058+-+Detailed+Design) and [SWE-111](https://swehb.nasa.gov/spaces/7150/pages/16450560/SWE-111+-+Software+Design+Description)

The guidance covers units, inputs and outputs, algorithms, data structures, control, timing, interfaces, resources, traceability, and review readiness. It is intentionally comprehensive and should be tailored outside high-assurance systems.

## Sources

- [arc42 Building Block View](https://docs.arc42.org/section-5/)
- [arc42 Runtime View](https://docs.arc42.org/section-6/)
- [NASA SWE-058: Detailed Design](https://swehb.nasa.gov/spaces/7150/pages/16450603/SWE-058+-+Detailed+Design)
- [NASA SWE-111: Software Design Description](https://swehb.nasa.gov/spaces/7150/pages/16450560/SWE-111+-+Software+Design+Description)
