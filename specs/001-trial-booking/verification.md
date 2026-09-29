# Verification Evidence: Trial Class Booking

**Verified**: 2026-09-29
**Branch**: `feature/trial-booking`
**Environment**: Windows, Node.js 24.21.0, pnpm 12.5.1, PostgreSQL 17 container

## Automated gates

| Gate                  | Result | Evidence                                                                       |
| --------------------- | ------ | ------------------------------------------------------------------------------ |
| Formatting            | PASS   | `pnpm format:check` — all matched files use Prettier style                     |
| Lint                  | PASS   | `pnpm lint` — zero warnings/errors                                             |
| Type safety           | PASS   | `pnpm typecheck` — zero TypeScript errors                                      |
| Full suite            | PASS   | `pnpm test` — 9 files, 30 tests passed                                         |
| Final-seat repetition | PASS   | `pnpm test:race` — 100 two-connection races plus independent-class case passed |
| Production build      | PASS   | `pnpm build` — page and all six API routes compiled                            |
| Migration replay      | PASS   | `pnpm db:migrate` — completed against an already-migrated database             |
| Synthetic seed        | PASS   | `pnpm db:seed` — deterministic dataset loaded                                  |

## Acceptance coverage

| Acceptance behavior                              | Verification                                               |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Available class confirms and enters roster       | `booking-service.test.ts`, `api.test.ts`, `roster.test.ts` |
| Failed payment does not enter roster             | `booking-service.test.ts`, `roster.test.ts`                |
| Duplicate active booking is prevented            | `schema.test.ts`, `idempotency.test.ts`                    |
| Full class remains at capacity                   | `booking-service.test.ts`                                  |
| Simultaneous final-seat attempts have one winner | `last-seat-race.test.ts`, repeated 100 times               |
| Booking and payment replays are stable           | `idempotency.test.ts`                                      |
| Conflicting key reuse changes no state           | `idempotency.test.ts`                                      |
| Roster contains confirmed bookings only          | `roster.test.ts`, `api.test.ts`                            |
| Different classes progress independently         | `last-seat-race.test.ts`                                   |
| Terminal booking rejects a new payment command   | `booking-service.test.ts`                                  |
| Accessible UI exposes the primary flow           | `booking-flow.test.tsx`                                    |

## TDD evidence

Red states were observed before implementation for domain policy, booking/payment application services,
HTTP routes, idempotent replay, payment-key conflicts, the roster endpoint, and the UI. Each phase was
made green and pushed as a separate commit. Database concurrency tests use independent real connections;
the database is not mocked.

## Reconciliation and deviations

- The specification, five booking statuses, OpenAPI paths, schema constraints, implementation, and
  README agree.
- The plan described Drizzle repositories for routine access. The implementation keeps Drizzle as the
  typed schema definition and uses parameterized postgres.js SQL in the repository adapter. This makes
  every count, filter, partial constraint, and lock visible in a short review; no behavior or boundary
  changed.
- The 100-race gate is explicit in `pnpm test:race`; the normal suite runs one race for speed.
- ESLint remains on the latest v9 release because the Next.js lint plugin peer range does not yet
  declare ESLint 10 support. Peer compatibility was preferred over a forced unsupported major.
- No Saga, Kafka, real payment, full authentication, or full GitFlow runtime code was introduced.

## Manual follow-up before submission

- Record the 5–8 minute walkthrough using the README outline.
- Add the final video link to the README.
- Make the GitHub repository public before sending it; the current remote was created as private.
