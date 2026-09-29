# AI Usage

## Tools and uses

Codex was used to analyze the take-home brief, structure the Spec Kit artifacts, propose architecture
decisions, generate test candidates, implement small red-green-refactor increments, run local quality
checks, and keep documentation aligned with observed behavior. GitHub Spec Kit 1.0.9 provided the
constitution, specification, planning, task, analysis, and implementation workflow structure.

## Where AI accelerated the work

The largest acceleration was turning the brief and prior planning notes into a traceable chain from
functional requirements to user stories, API/data contracts, ordered tasks, and automated tests. It
also shortened the feedback loop for PostgreSQL concurrency by generating a two-connection barrier
test and immediately running it against the real database rather than a mock.

## Suggestions rejected or deferred

- A distributed Saga was rejected for the runtime because mock payment and booking state share one
  authoritative transaction boundary. Compensation is documented for a future real-payment flow.
- Kafka was rejected because the exercise has no demonstrated throughput, replay, ordering, or
  independent-consumer requirement. A transactional outbox is the first production evolution.
- Full GitFlow was rejected because one timeboxed feature does not need long-running develop, release,
  and hotfix branches. A short-lived feature branch with phase commits is more reviewable.
- Additional frameworks and generic repository abstractions were rejected because they added surface
  area without protecting a present change boundary.

## Corrections made during implementation

- Database test files initially interfered through a shared test database. The suite exposed foreign
  key and duplicate-email failures; file-level parallelism was disabled while use-case concurrency is
  tested explicitly with independent connections.
- The first UI assertion expected `fetch` to receive one argument, while the wrapper consistently
  passed an explicit `undefined` options value. The assertion was corrected without weakening the
  behavior being tested.
- Dependency warnings were reviewed rather than ignored: the assertion library moved to its current
  supported major, while ESLint remained on the latest v9 because Next’s lint plugins do not yet
  declare ESLint 10 compatibility.

## Verification and human review

AI-generated code was not accepted based on appearance. Each behavior phase began with an executable
failing test, then passed before its commit. The final gate runs formatting, linting, type checking,
unit tests, HTTP contracts, real PostgreSQL integration tests, a 100-iteration final-seat race, a
production build, migration, and synthetic seed. The transaction protocol, SQL constraints, error
mapping, README claims, and Spec Kit task completion were reviewed together.

## Workflow improvements for a longer project

For a production project, keep the same small Spec Kit chain but add pull-request review, CI services
for PostgreSQL, migration rollback practice, property-based state-machine tests, security checks,
structured observability, and a staging payment provider. Add requirements before infrastructure so
Saga, outbox, or broker choices remain evidence-driven.
