# LLD Delivery and Verification

Use this guide for quality budgets, security, observability, testing, migration, launch, rollback, technical debt, and implementation planning.

The examples are synthetic and demonstrate how delivery sections connect a requirement to a verifiable implementation action.

## Quality budgets

**Principle:** Allocate inherited system requirements to the component operations and resources that can violate them.

Translate inherited non-functional requirements into component budgets:

- Per-operation latency and timeout
- Throughput and concurrency
- Memory, CPU, storage, and network
- Availability and error budget
- Recovery time and data loss
- Queue, cache, connection, and thread limits

State how each budget will be measured and what happens when it is exceeded.

**Good example:** "`CreatePayment` receives 150 ms of the 300 ms API budget: 20 ms for idempotency storage, 100 ms for Payments, and 30 ms for serialization and network variance. A storage timeout stops the downstream call."

## Security, privacy, and data handling

**Principle:** Derive controls from concrete entry points, principals, data, and threats.

Identify:

- Entry points and trust boundaries
- Principal and authorization decision
- Input validation and output encoding
- Credential and secret handling
- Data classification, encryption, retention, and deletion
- Audit events
- Abuse and rate controls
- Required reviews and owners

Tie controls to concrete threats or requirements. Do not include a boilerplate security section with no system boundary.

**Good example:** "The API derives merchant identity from the authenticated principal and never accepts it from the payload. Idempotency records store a payload hash and encrypted response, then expire after 24 hours."

## Observability and operations

**Principle:** Give an operator a signal, owner, and action for every failure that matters at runtime.

For each important behavior or failure, define:

- Metric and dimensions
- Log or trace event
- Alarm threshold and evaluation window
- Dashboard or query
- Owner and escalation path
- Runbook action
- Success metric and launch guardrail

An operator should be able to detect and localize failure without reading source code.

**Good example:** "`IdempotencyRecordStuck` counts `IN_PROGRESS` records older than two lease periods by merchant and operation. The alarm links the recovery runbook and pages Payments On-Call after two consecutive windows."

## Test methodology

**Principle:** Map each invariant and failure contract to a reproducible test with an expected result.

Map requirements, invariants, and failure modes to:

- Unit tests
- Contract tests
- Integration tests
- Property or model tests
- Migration and compatibility tests
- Load and stress tests
- Failure and recovery tests
- Security tests
- End-to-end or user acceptance tests

State environment, fixtures, isolation, expected result, and automation. Do not use a test category as a substitute for a testable claim.

**Good example:** "Start two requests with the same key and different payload hashes behind a barrier. Exactly one conditional put succeeds, Payments receives one call, and the loser receives `409 KeyPayloadMismatch`."

## Migration and compatibility

**Principle:** Sequence mixed-version behavior so every deployed combination preserves the contract.

Specify exact phases:

1. Introduce compatible readers or writers.
2. Deploy schema or contract support.
3. Backfill or shadow.
4. Validate and reconcile.
5. Shift traffic or ownership.
6. Observe through a bake period.
7. Remove legacy behavior.

State the last safe rollback point and behavior under mixed versions. Include cleanup and deprecation ownership.

**Good example:** "Readers first tolerate the new `RECOVERABLE` state. Writers begin emitting it only after every region runs the tolerant reader. Rollback remains safe until the first new-state record is written."

## Launch and rollback

**Principle:** Convert release into staged exposure with measured stop criteria and state-aware reversal.

Define feature flags, allowlists, staged exposure, guardrails, bake periods, stop criteria, rollback command or mechanism, data repair, and post-launch cleanup.

Rollback must account for state already written under the new behavior.

**Good example:** "Enable 1% of merchants for 24 hours, then 10% and 50%. Stop if duplicate downstream calls exceed zero or stuck records exceed 0.01%; rollback disables new claims but leaves recovery workers active for existing records."

## Technical debt and limitations

**Principle:** Record intentional debt with its consequence and removal trigger, not as an unowned future wish.

Name debt deliberately introduced, why it is acceptable, effect, owner, and trigger or date for removal. Avoid converting every non-goal into technical debt.

**Good example:** "The first release keeps response blobs in the idempotency table, increasing storage cost. Payments Platform owns extraction to object storage when p99 item size exceeds 200 KB."

## Work breakdown

**Principle:** Derive implementation tasks from components, contracts, transitions, tests, operations, and cleanup.

Map implementation tasks to components, contracts, migrations, tests, operations, and cleanup. Record dependencies and estimates at the team's useful planning granularity.

The work breakdown should be derivable from the design. A missing task often indicates an unmodeled contract or transition.

**Good example:** "`Repository conditional transitions` depends on the finalized state schema; `concurrency integration test` depends on repository and fake Payments support; `legacy cleanup` starts after the rollback window closes."

## Delivery review checks

- Quality requirements have measurable component budgets.
- Security controls map to actual entry points and data.
- Every critical failure has a signal, owner, and response.
- Tests cover invariants, compatibility, and failure behavior.
- Migration works under mixed versions and identifies rollback limits.
- Launch guardrails map to success and stop criteria.
- Work items include cleanup and operational ownership.

## Primary sources

- [Provided Amazon LLD template](https://quip-amazon.com/3ZyPACZWbg0y/Low-Level-Design-Template)
- [NASA SWE-058: Detailed Design](https://swehb.nasa.gov/spaces/7150/pages/16450603/SWE-058+-+Detailed+Design)
- [NASA SWE-111: Software Design Description](https://swehb.nasa.gov/spaces/7150/pages/16450560/SWE-111+-+Software+Design+Description)
