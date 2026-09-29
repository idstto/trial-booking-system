# Trial Booking System

A small, reliability-focused take-home implementation for booking a child into a trial class. A
seeded parent can choose a child and class, create a booking, simulate payment success or failure, see
the final status, and inspect the confirmed-only roster. PostgreSQL remains correct under retries,
duplicates, and simultaneous attempts for the final seat.

## Quick start

Prerequisites: Node.js 24+, pnpm 12+, and Docker with Compose.

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The seed uses synthetic data only. The default
demo parent is `Ari Parent` with children Maya and Noah.

## Verification

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:race
pnpm build
```

`pnpm test:race` runs the final-seat scenario 100 times using two independent PostgreSQL connections.
Docker must be running for integration, contract, and race tests. Tests use the separate
`trial_booking_test` database; create it once if it does not exist:

```powershell
docker compose exec -T db createdb -U postgres trial_booking_test
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/trial_booking_test'
pnpm db:migrate
```

### Browser walkthrough

Install the Playwright Chromium runtime once, then run the deterministic walkthrough:

```powershell
pnpm exec playwright install chromium
pnpm test:e2e:walkthrough
```

The walkthrough migrates and reseeds the database configured by `DATABASE_URL`, starts the application,
and verifies successful payment, roster refresh, failed payment, and duplicate protection in a real
browser. It writes screenshots, a WebM recording, and the optional narration transcript under
`artifacts/walkthrough/`. These generated walkthrough artifacts are intentionally ignored by Git.

## What was built

- Parent flow: list children and trial classes, create a pending booking, simulate payment, and show
  final status.
- Staff view: confirmed-only roster for the selected class.
- Booking statuses: `pending_payment`, `confirmed`, `payment_failed`, `capacity_unavailable`, and
  `cancelled`.
- Stable JSON envelopes with request IDs and domain error codes.
- Idempotent booking and payment-result commands using required `Idempotency-Key` headers and stored
  request fingerprints.
- PostgreSQL constraints for positive capacity, unique command keys, payment audit data, confirmed
  timestamp consistency, and one active child/class booking.
- Deterministic synthetic seed cases for ordinary availability, payment failure, duplicate booking,
  a final seat, and a full class.

## Architecture

```text
UI / Next.js route handlers
            ↓
BookingService (use cases and transaction policy)
            ↓
BookingRepository ports
            ↑
PostgreSQL repository + transaction unit of work
            ↓
PostgreSQL constraints and row locks
```

Responsibilities are deliberately narrow:

- `src/app`: accessible UI and transport-only route handlers.
- `src/application`: use cases, small persistence ports, idempotency fingerprints, composition root.
- `src/domain`: framework-free status policy and typed domain errors.
- `src/infrastructure/db`: PostgreSQL/Drizzle schema, queries, transactions, and lock protocol.
- `tests`: unit, HTTP contract, and real PostgreSQL integration/concurrency verification.

This applies SOLID principles where they protect change boundaries. There is no generic repository
base class or speculative abstraction: interfaces use booking language and expose only operations the
use cases need.

## Data and API

The model contains `parents`, `students`, `trial_classes`, `bookings`, and `payment_attempts`. The full
contract is in [OpenAPI](specs/001-trial-booking/contracts/openapi.yaml) and the lifecycle is in the
[data model](specs/001-trial-booking/data-model.md).

| Method | Route                               | Purpose                           |
| ------ | ----------------------------------- | --------------------------------- |
| `GET`  | `/api/students`                     | Children for the seeded parent    |
| `GET`  | `/api/trial-classes`                | Classes and advisory availability |
| `POST` | `/api/bookings`                     | Create a pending booking          |
| `GET`  | `/api/bookings/{id}`                | Read current booking status       |
| `POST` | `/api/bookings/{id}/payment-result` | Apply simulated success/failure   |
| `GET`  | `/api/trial-classes/{id}/roster`    | Confirmed-only roster             |

## Final-seat correctness

Successful payment processing uses one transaction and one lock order:

1. Lock and validate the booking.
2. Return an exact stored replay or reject a conflicting idempotency payload.
3. Lock the relevant `trial_classes` row.
4. Count confirmed bookings while that class lock is held.
5. Store the payment audit record and update the booking to `confirmed` or
   `capacity_unavailable` atomically.

Every capacity-changing path follows that protocol. Different classes lock different rows and can
progress independently. `READ COMMITTED` is sufficient because the class row serializes the protected
count/check/write sequence. UI availability is only a snapshot and never authorizes a seat.

## Assumptions and deliberate cuts

- A trusted seeded parent replaces full authentication; production must enforce parent ownership and
  staff roles.
- Payment is a local result, not an external charge. A production version should authorize, claim the
  seat, capture, then void/refund and reconcile uncertain outcomes.
- Only confirmed bookings consume capacity. There are no seat holds or expiry workers.
- Regular enrollment, notifications, real payments, deployment infrastructure, and a complex admin UI
  are outside the four-hour exercise scope.
- No distributed Saga or Kafka is implemented. With independent payment/notification commits, add a
  transactional outbox first and introduce Saga compensation or Kafka only when measured requirements
  justify their failure modes and operations.
- The repository uses `main` plus `feature/trial-booking`, not full GitFlow.

## Monitoring in production

Track booking outcomes, payment failures, capacity losses after successful payment, idempotent replay
and conflict counts, confirmation latency, class-lock wait time, and stale pending bookings. Alert on
either invariant violation: confirmed occupancy above capacity or a non-confirmed booking in roster
output. Log request IDs and domain codes, never child details or payment secrets.

## Spec-driven and test-driven workflow

The governing artifacts live in [`specs/001-trial-booking`](specs/001-trial-booking). The repository
also includes the Spec Kit constitution and workflow. Each implementation phase was developed as a
red-green-refactor increment, committed, and pushed separately. The commit history shows the setup,
foundation, booking/payment, idempotency/concurrency, roster, UI, and final verification phases.

Approximate time spent: 3 hours across planning conversion, implementation, automated verification,
and documentation. The final README should be updated if additional polish or video work changes the
total.

## Five-to-eight-minute demo outline

1. Explain the scope, statuses, and architecture (60 seconds).
2. Run the successful booking flow and show the roster update (90 seconds).
3. Run a payment failure and duplicate/replay example (60 seconds).
4. Run `pnpm test:race` and explain the booking-then-class lock order (90 seconds).
5. Show the schema constraints, test layers, deliberate cuts, and production payment evolution
   (90 seconds).

Final delivery must be a public GitHub repository plus the video link; the brief does not accept a zip
file.
