# Implementation Plan: Trial Class Booking

**Branch**: `feature/trial-booking` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-trial-booking/spec.md`

## Summary

Build one server-led TypeScript web application in which a seeded parent can create and mock-pay for
a child’s trial booking while staff can inspect a confirmed-only roster. Next.js route handlers stay
thin, an application service owns use cases and transaction boundaries, Drizzle repositories own
persistence, and PostgreSQL enforces duplicate, idempotency, and capacity invariants. Delivery uses
red-green-refactor increments and real PostgreSQL integration tests for concurrency behavior.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24 LTS

**Primary Dependencies**: Next.js 16.3, React 19.3, Drizzle ORM 0.45, Zod, postgres.js

**Storage**: PostgreSQL 17 in Docker Compose; Drizzle migrations plus explicit SQL for the partial
unique index and `SELECT ... FOR UPDATE`

**Testing**: Vitest 5, Testing Library, direct PostgreSQL integration tests, optional Playwright smoke
test only after required coverage

**Target Platform**: Modern desktop/mobile browsers and a Node.js server on Linux or Windows with
Docker available for PostgreSQL

**Project Type**: Single full-stack web application

**Performance Goals**: Local API reads complete within 500 ms at p95; uncontended booking commands
complete within 1 second; no correctness degradation during 100 repeated final-seat races

**Constraints**: Four-hour take-home scope; capacity defaults to four; one database authority; no real
payment provider, distributed Saga, Kafka, full authentication, or full GitFlow

**Scale/Scope**: Seeded demo with two parents, six students, several trial classes, five booking
statuses, six HTTP operations, and one compact booking/roster UI

## Constitution Check

_GATE: Passes before Phase 0 and after Phase 1._

| Principle              | Design evidence                                                                                                  | Status |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| Test-First Delivery    | Each story’s tasks place tests before production code; database and HTTP contracts use real boundaries.          | PASS   |
| Database correctness   | Partial uniqueness, idempotency constraints, class-row locking, and confirmed-only queries are explicit.         | PASS   |
| SOLID boundaries       | UI, route, application, domain, repository, and adapter responsibilities are separated with inward dependencies. | PASS   |
| Simplicity and scope   | One deployable app and one database; deferred infrastructure is documented only.                                 | PASS   |
| Traceable verification | FR/SC identifiers map to contracts, tasks, and the verification matrix.                                          | PASS   |

Post-design re-check: PASS. No exception or complexity waiver is required.

## Architecture and Design

The dependency direction is `app/routes -> application services -> domain ports <- infrastructure`.
Route handlers parse Zod input, attach the seeded identity and request ID, invoke one use case, then map
typed domain errors to HTTP. `BookingService` coordinates booking creation and payment-result handling;
repositories hide Drizzle/query details. The success-payment transaction locks booking then class,
checks/records idempotency, counts confirmed bookings while the class lock is held, and writes one
terminal result. Every capacity-changing path follows this lock order.

Creation idempotency uses a unique request key plus a stored request fingerprint. Payment idempotency
uses a unique attempt key plus result/fingerprint fields. An exact replay returns the stored outcome;
a different payload for the same key returns `IDEMPOTENCY_CONFLICT`. The active-booking partial index
provides the final duplicate guard.

## Project Structure

### Documentation (this feature)

```text
specs/001-trial-booking/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── bookings/
│   │   ├── students/
│   │   └── trial-classes/
│   ├── globals.css
│   └── page.tsx
├── application/
│   ├── booking-service.ts
│   └── ports.ts
├── domain/
│   ├── booking.ts
│   └── errors.ts
├── infrastructure/
│   └── db/
│       ├── repositories.ts
│       ├── schema.ts
│       └── transaction-manager.ts
└── lib/
    ├── env.ts
    ├── http.ts
    └── request-id.ts

drizzle/
├── migrations/
└── seed.ts

tests/
├── contract/
├── integration/
├── unit/
└── helpers/
```

**Structure Decision**: Keep Next.js as the only application framework and expose one composition root
for application services. Domain/application code has no dependency on Next.js. Persistence adapters
depend on the application ports, satisfying dependency inversion without a second backend project.

## Delivery Phases

1. Establish toolchain, database, migrations, seed, and test harness.
2. Test and implement domain transitions and error contracts.
3. Test and implement booking creation, payment outcomes, idempotency, roster filtering, and the
   deterministic last-seat race.
4. Add thin route handlers and contract tests.
5. Add the minimal accessible UI and verify the end-to-end journey.
6. Reconcile documentation, run all quality gates, and repeat the race test 100 times.

## Complexity Tracking

No constitution violations. The repository interface and transaction manager exist because integration
tests must substitute transaction-scoped adapters and because database policy must stay out of routes;
they remain small, use-case-oriented interfaces rather than a generic persistence framework.
