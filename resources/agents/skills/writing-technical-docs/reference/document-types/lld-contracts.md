# LLD Contracts and Behavior

Use this guide for component decomposition, interfaces, data, invariants, runtime behavior, algorithms, validation, errors, and concurrency.

The examples are synthetic and show how each section should make an implementation decision testable.

## HLD inheritance and scope

**Principle:** State the architectural decisions this component inherits and the decisions it is still allowed to make.

Link the approved HLD and summarize only:

- The component's purpose
- Requirements and quality attributes in scope
- Architectural decisions that the LLD must preserve
- Assumptions and open questions delegated to this design
- Explicit non-scope

Do not silently reopen an HLD decision. Mark a required change and route it back to architectural review.

**Good example:** "The HLD fixes DynamoDB as the idempotency source of truth and a 24-hour key lifetime. This LLD chooses the record state machine and conditional-write protocol; changing the source of truth requires HLD review."

## Module decomposition

**Principle:** Split modules by stable responsibility and state ownership, not by arbitrary class count.

For each module or implementation unit, state:

- Responsibility and non-responsibility
- Public interface
- State owned
- Dependencies
- Source or package location when known
- Lifecycle and ownership
- Reason for the boundary

Use black-box descriptions first. Refine only modules that are important, surprising, risky, complex, or volatile.

**Good example:** "`IdempotencyRepository` owns conditional record creation and state transitions. `PaymentHandler` owns downstream payment calls and cannot update an idempotency record except through that repository."

## Interface contracts

**Principle:** Specify semantic guarantees, invalid inputs, compatibility, and ambiguous outcomes in addition to request and response shape.

For each API, event, command, callback, or file contract, define:

- Operation and semantic purpose
- Inputs, outputs, types, cardinality, and limits
- Required and optional fields
- Validation and normalization
- Authentication and authorization
- Success and error semantics
- Timeout, cancellation, and retry contract
- Idempotency and duplicate behavior
- Ordering and consistency
- Versioning and compatibility
- Ownership and service-level assumptions

Link machine-readable definitions. Explain the invariants and compatibility decisions that generated artifacts do not convey.

**Good example:** "`CreatePayment(key, payloadHash)` returns the stored response for a completed matching key, returns `409 KeyPayloadMismatch` for a different hash, and returns `202 InProgress` while the original request owns the lease."

## Data model and invariants

**Principle:** Define the truths every valid record and transition must preserve before listing fields.

Describe:

- Entities and relationships
- Keys, uniqueness, and partitioning
- Invariants and state transitions
- Access patterns and indexes
- Consistency and transaction boundary
- Retention, classification, encryption, and deletion
- Schema evolution and compatibility
- Migration, backfill, validation, and rollback

A field list without invariants is not a design.

**Good example:** "A record moves `ABSENT -> IN_PROGRESS -> COMPLETED` or `IN_PROGRESS -> RECOVERABLE`. `payload_hash` is immutable, and only the current lease owner may publish `response_blob`."

## Runtime behavior

**Principle:** Describe the normal path first, then vary one failure, boundary, or concurrency condition at a time.

Describe the normal path first, then:

- Invalid input
- Empty or boundary conditions
- Dependency timeout and failure
- Partial success
- Duplicate and out-of-order delivery
- Retry and backoff
- Cancellation
- Concurrency and races
- Startup, shutdown, and draining
- Replay, recovery, and reconciliation

Use sequence, activity, state, or timing diagrams when they communicate behavior more precisely than prose. Define diagram terms before later text relies on them.

**Good example:** "The first request creates `IN_PROGRESS` with a conditional put, calls Payments, and stores the response. A concurrent request that loses the conditional put reads the record and follows its state rather than calling Payments."

## Error handling

**Principle:** For every failure point, state returned behavior, persisted state, retry ownership, cleanup, and signal.

At each failure point, state:

- Error detected
- Error returned or recorded
- Retryability and ownership
- State left behind
- Cleanup or compensation
- Customer or caller effect
- Metric, log, trace, or alarm

Separate application errors from infrastructure outage and recovery behavior.

**Good example:** "If Payments succeeds and the response write times out, the handler leaves `IN_PROGRESS`, emits `response_persist_unknown`, and returns an ambiguous error. Recovery queries Payments by operation ID before completing the record."

## Concurrency and timing

**Principle:** Make races explicit by naming shared state, ordering, ownership, and the condition that makes an interleaving safe.

Name shared state, ordering guarantees, locks or optimistic controls, race windows, timeout budgets, clock assumptions, and behavior during overlapping operations. Explain why any accepted race is safe.

**Good example:** "A 30-second lease is compared with the datastore's server time. Renewal uses the current lease token, so an expired worker cannot overwrite the response published by its successor."

## Algorithms

**Principle:** Explain only logic whose correctness, complexity, or resource use is not obvious from the contract.

Document only novel or decision-relevant algorithms. Include:

- Inputs and outputs
- Preconditions and invariants
- Pseudocode or flow
- Time and space complexity
- Resource limits
- Numerical, ordering, or consistency behavior
- Alternatives considered

Do not transcribe routine code that is clearer in the implementation.

**Good example:** "Recovery scans the expiry index in pages of 100 and conditionally claims each stale record. The work is `O(stale records)` and never scans completed records."

## Contract review checks

- Every module has one coherent responsibility.
- Contracts specify semantics in addition to shape.
- Invariants are testable.
- State transitions cover invalid and recovery paths.
- Concurrency assumptions are explicit.
- Errors identify state, retryability, and signals.
- Detail is implementation-significant and traceable to the HLD.

## Primary sources

- [arc42 Building Block View](https://docs.arc42.org/section-5/)
- [arc42 Runtime View](https://docs.arc42.org/section-6/)
