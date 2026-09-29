# Tasks: Trial Class Booking

**Input**: Design documents from `/specs/001-trial-booking/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`

**Tests**: Mandatory. For every behavior task, write and observe the corresponding test fail before
adding production code, then refactor only with a green suite.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a deterministic full-stack and test toolchain.

- [X] T001 Initialize the Next.js/TypeScript/pnpm project and scripts in `package.json`
- [X] T002 [P] Configure TypeScript, Next.js, Vitest, ESLint, and formatting in `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, and `.prettierrc.json`
- [X] T003 [P] Create environment and ignore baselines in `.env.example`, `.gitignore`, `.dockerignore`, and `.prettierignore`
- [X] T004 [P] Add PostgreSQL service and health check in `docker-compose.yml`
- [X] T005 Create the application folder boundaries documented in `specs/001-trial-booking/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared schema, configuration, error, database, and test foundations.

- [X] T006 [P] Define booking/payment status types and legal terminal transitions in `src/domain/booking.ts`
- [X] T007 [P] Define stable domain error codes and HTTP-independent errors in `src/domain/errors.ts`
- [X] T008 Write failing domain transition and error tests in `tests/unit/booking.test.ts`
- [X] T009 Implement the tested transition policy in `src/domain/booking.ts`
- [X] T010 [P] Define validated environment access in `src/lib/env.ts`
- [X] T011 [P] Define Drizzle tables with UUID keys, UTC timestamps, positive capacity, request fingerprints, and payment audit fields in `src/infrastructure/db/schema.ts`
- [X] T012 Add SQL migration with foreign keys, unique request/payment keys, confirmed timestamp check, and active `(student_id, trial_class_id)` partial unique index in `drizzle/0000_initial.sql`
- [X] T013 Implement database connection and transaction composition in `src/infrastructure/db/client.ts` and `src/infrastructure/db/transaction-manager.ts`
- [X] T014 Build isolated PostgreSQL migration/reset helpers in `tests/helpers/database.ts`
- [X] T015 Add deterministic synthetic records covering ordinary, full, last-seat, duplicate, and failure fixtures in `drizzle/seed.ts`

**Checkpoint**: Schema and test database can be created and reset without manual edits.

---

## Phase 3: User Story 1 - Parent books and pays (Priority: P1) 🎯 MVP

**Goal**: Complete a successful, failed, or full-class mock-payment journey.

**Independent Test**: Create a pending booking, apply success/failure/full-class results, and verify
status and occupancy through the application service.

### Tests for User Story 1

- [X] T016 [P] [US1] Write failing repository integration tests for class availability, booking persistence, and payment audit fields in `tests/integration/repositories.test.ts`
- [X] T017 [P] [US1] Write failing application integration tests for happy path, payment failure, full class, missing resources, and invalid terminal transitions in `tests/integration/booking-service.test.ts`

### Implementation for User Story 1

- [X] T018 [US1] Define narrow transaction-scoped application ports in `src/application/ports.ts`
- [X] T019 [US1] Implement Drizzle/PostgreSQL repository adapters in `src/infrastructure/db/repositories.ts`
- [X] T020 [US1] Implement create booking and apply payment result use cases in `src/application/booking-service.ts`
- [X] T021 [P] [US1] Write failing HTTP contract tests for students, classes, booking creation, payment result, and booking status in `tests/contract/api.test.ts`
- [X] T022 [US1] Implement request IDs, response envelopes, validation, and error mapping in `src/lib/request-id.ts` and `src/lib/http.ts`
- [X] T023 [US1] Implement thin handlers in `src/app/api/students/route.ts`, `src/app/api/trial-classes/route.ts`, `src/app/api/bookings/route.ts`, `src/app/api/bookings/[bookingId]/route.ts`, and `src/app/api/bookings/[bookingId]/payment-result/route.ts`

**Checkpoint**: US1 contract and integration tests pass independently.

---

## Phase 4: User Story 2 - Stable retries and final-seat competition (Priority: P1)

**Goal**: Guarantee one active booking, deterministic replays, and at most one final-seat winner.

**Independent Test**: Concurrently submit duplicate and final-seat commands through distinct database
connections, replay both command types, and verify exact stored outcomes.

### Tests for User Story 2

- [ ] T024 [P] [US2] Write failing integration tests for booking replay, payment replay, conflicting payload reuse, and concurrent duplicate booking in `tests/integration/idempotency.test.ts`
- [ ] T025 [P] [US2] Write the failing two-connection final-seat barrier test and independent-class concurrency test in `tests/integration/last-seat-race.test.ts`

### Implementation for User Story 2

- [ ] T026 [US2] Implement deterministic command fingerprints and exact replay/conflict rules in `src/application/idempotency.ts` and `src/application/booking-service.ts`
- [ ] T027 [US2] Implement the booking-then-class lock protocol and confirmed count under lock in `src/infrastructure/db/repositories.ts`
- [ ] T028 [US2] Map duplicate, idempotency, invalid-transition, and capacity outcomes to stable HTTP responses in `src/lib/http.ts`

**Checkpoint**: The race test passes 100 repetitions with one winner and occupancy exactly at capacity.

---

## Phase 5: User Story 3 - Staff views confirmed roster (Priority: P2)

**Goal**: Show only confirmed children for a selected class.

**Independent Test**: Query a fixture containing every booking status and receive only confirmed rows.

### Tests for User Story 3

- [ ] T029 [P] [US3] Write failing confirmed-only roster repository and service tests in `tests/integration/roster.test.ts`
- [ ] T030 [P] [US3] Add the failing roster HTTP contract case to `tests/contract/api.test.ts`

### Implementation for User Story 3

- [ ] T031 [US3] Implement the confirmed-only roster query and use case in `src/infrastructure/db/repositories.ts` and `src/application/booking-service.ts`
- [ ] T032 [US3] Implement `GET /api/trial-classes/{classId}/roster` in `src/app/api/trial-classes/[classId]/roster/route.ts`

**Checkpoint**: Mixed-status data produces a roster containing confirmed entries only.

---

## Phase 6: Minimal UI and Cross-Cutting Completion

**Purpose**: Demonstrate the verified backend and prepare a public-repository-ready submission.

- [ ] T033 Write failing component tests for selection, booking, payment controls, visible status, and roster refresh in `tests/unit/booking-flow.test.tsx`
- [ ] T034 Implement the accessible server-led booking interface in `src/app/page.tsx`, `src/app/booking-flow.tsx`, and `src/app/globals.css`
- [ ] T035 [P] Add scripts for migrate, seed, unit, integration, contract, and 100-run race verification in `package.json`
- [ ] T036 [P] Write accurate setup, architecture, transaction, tradeoff, monitoring, and demo guidance in `README.md`
- [ ] T037 [P] Document AI acceleration, rejected suggestions, corrections, and verification in `AI_USAGE.md`
- [ ] T038 Run format, lint, typecheck, build, all tests, seed validation, and 100 race repetitions; record evidence in `specs/001-trial-booking/verification.md`
- [ ] T039 Reconcile `spec.md`, `plan.md`, contracts, implementation, README, and AI notes; document any deliberate deviation in `specs/001-trial-booking/verification.md`

---

## Dependencies & Execution Order

- Phase 1 has no dependency.
- Phase 2 depends on Phase 1 and blocks every user story.
- US1 and US2 are both P1; implement US1 before US2 because US2 hardens its command paths.
- US3 depends on the shared repository/service foundations but is independently verifiable.
- Phase 6 begins after all backend story checkpoints pass.
- Inside every story: failing tests → smallest implementation → refactor with green tests.

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| FR-001–FR-005, FR-012–FR-014 | T016–T023 |
| FR-007–FR-011 | T024–T028 |
| FR-006 | T029–T032 |
| FR-015 | T014–T015 |
| SC-001, SC-006 | T033–T039 |
| SC-002, SC-004 | T024–T028, T038 |
| SC-003, SC-005 | T016–T032, T038 |

## Parallel Opportunities

- T002–T004 touch independent configuration files.
- T006, T007, T010, and T011 are independent definitions before integration.
- Test files marked `[P]` can be authored independently before their shared implementation begins.
- Documentation tasks T036 and T037 can proceed after behavior stabilizes.

## Implementation Strategy

The MVP is Setup + Foundational + US1. US2 is required before claiming correctness because it contains
the evaluated duplicate/idempotency/race behavior. US3 and the UI complete the required demonstrable
slice. Stop at any checkpoint if a sequential task fails; do not bypass a red test with a weaker test.
