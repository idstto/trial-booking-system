# Research and Decisions: Trial Class Booking

## Decision: One Next.js application with thin route handlers

**Rationale**: The take-home needs a compact UI and backend. One deployment keeps setup small while
application/domain modules remain independent of the framework.

**Alternatives considered**: NestJS plus a separate frontend adds configuration and duplicated
transport concerns; direct database access in route handlers obscures use cases and transaction rules.

## Decision: PostgreSQL is the concurrency authority

**Rationale**: Row locks, partial unique indexes, transactions, and multiple real connections directly
demonstrate the evaluated final-seat behavior. `READ COMMITTED` is sufficient when every capacity
mutation locks the same class row before checking confirmed occupancy.

**Alternatives considered**: In-memory storage is process-local; SQLite locking is not representative;
serializable isolation is valid but adds retry behavior without improving this bounded explanation.

## Decision: Lock booking then class during successful payment handling

**Rationale**: A consistent lock order prevents capacity races and reduces deadlock risk. Counting
confirmed rows while holding the class lock makes one class the serialization unit while unrelated
classes progress independently.

**Alternatives considered**: A conditional capacity counter is viable but duplicates derived state;
seat holds add expiry and cleanup outside the timebox.

## Decision: Drizzle for schema/readability, explicit SQL for lock-sensitive operations

**Rationale**: Drizzle provides typed routine access without hiding PostgreSQL semantics. Explicit SQL
keeps the partial index and `FOR UPDATE` protocol visible to reviewers.

**Alternatives considered**: A heavier ORM can obscure locking; raw SQL everywhere increases routine
mapping code and weakens type feedback.

## Decision: TDD at domain, database, and HTTP boundaries

**Rationale**: Pure status transitions get fast unit tests; constraints and concurrency get real
PostgreSQL integration tests; routes get contract tests. This follows the test pyramid without mocking
away the exact risks under evaluation.

**Alternatives considered**: UI-only tests are slow and poor at race diagnosis; repository mocks could
pass while actual locking and constraints are wrong.

## Decision: Explicit application ports, no generic repository base class

**Rationale**: Small interfaces describe only operations required by booking use cases. This supports
dependency inversion and interface segregation while preserving domain language.

**Alternatives considered**: A generic CRUD repository creates broad interfaces and leaks storage
semantics; direct imports violate dependency direction.

## Decision: Local transaction/state machine, not Saga or Kafka

**Rationale**: The implemented flow has one authoritative database and a recorded mock result. A
transactional outbox is the first production evolution; a Saga becomes appropriate only when payment
and compensation commit independently. Kafka requires measured replay, throughput, ordering, or
independent-consumer needs.

**Alternatives considered**: Implementing distributed infrastructure would create failure modes that
do not satisfy any current requirement.

## Decision: pnpm and pinned major-compatible dependencies

**Rationale**: pnpm is available in the environment, produces a deterministic lockfile, and is fast for
the constrained implementation window. Versions are captured by the committed lockfile.

**Alternatives considered**: npm is unavailable in the current runtime; Bun could reduce install time
but would add a less conventional reviewer prerequisite.

