# Trial Booking System Constitution

## Core Principles

### I. Test-First Delivery (NON-NEGOTIABLE)

Every behavior change MUST begin with an executable test that expresses the intended outcome. The
test MUST be observed failing for the expected reason before production code is added, then made to
pass with the smallest reasonable implementation, followed by refactoring while the suite remains
green. Concurrency, database constraints, and HTTP contracts MUST be tested at their real boundary;
they MUST NOT be replaced solely by mocks. A task is incomplete until its relevant automated tests
pass.

### II. Domain Correctness at the Database Boundary

Business invariants MUST remain true under retries, duplicate requests, and concurrent processes.
PostgreSQL constraints and transactions are the final authority for booking uniqueness, idempotency,
capacity, and roster membership. Application checks and UI availability are advisory safeguards, not
the source of truth. Capacity-changing operations MUST follow one documented lock order, and only
confirmed bookings may consume seats or appear on rosters.

### III. SOLID, Explicit Boundaries

Each module MUST have one clear reason to change. Route handlers own transport concerns; application
services coordinate use cases and transactions; repositories own persistence details; domain types
express rules; adapters isolate external behavior. Dependencies MUST point toward domain and
application policy through small interfaces where substitution has concrete value. Public contracts
MUST be narrow and clients MUST NOT depend on methods they do not use. Abstractions created only for
possible future needs are prohibited.

### IV. Simplicity and Scope Discipline

The implementation MUST be the smallest reliable slice that satisfies the take-home brief. New
infrastructure requires a current, testable requirement. Kafka, a distributed Saga, real payments,
full authentication, notifications, regular enrollment, and complex administration remain out of
scope. Production evolution may be documented, but speculative components MUST NOT enter the runtime.

### V. Traceable, Verifiable Delivery

Every must-have requirement MUST map to acceptance criteria, implementation tasks, and one or more
verification cases. Specifications, contracts, tests, code, README instructions, and AI usage notes
MUST agree. Claims of correctness MUST cite a passing automated test or a recorded manual check.
Failures MUST use stable domain codes and logs MUST provide correlation without exposing child or
payment-sensitive data.

## Technical Constraints

- The system is one TypeScript web application using Next.js App Router and route handlers.
- PostgreSQL is the authoritative store; Drizzle may handle routine access while explicit SQL is
  preferred for partial indexes and row locks.
- Vitest is the default test runner. Database integration tests MUST use PostgreSQL.
- Mock payment results are recorded locally. No external service call may occur inside a database
  transaction.
- Synthetic seed data only; timestamps are UTC; secrets and real personal data MUST NOT be committed.
- The repository uses `main` plus a short-lived feature branch. Full GitFlow is not required.

## Development Workflow and Quality Gates

Work follows the Spec Kit sequence: specify, plan, tasks, analyze, implement, and verify. Behavioral
changes update the governing artifact before or with the code. Implementation proceeds in small
red-green-refactor increments. Before completion, formatting, linting, type checking, unit tests,
database integration tests, API tests, and the deterministic last-seat race test MUST pass. Setup,
migration, seed, and test commands MUST work from a fresh clone without undocumented manual edits.

Code review MUST check responsibility boundaries, dependency direction, duplicated logic, transaction
scope, error semantics, and whether the simplest adequate design was chosen. Any exception to a MUST
rule requires a written rationale in the implementation plan and explicit user approval.

## Governance

This constitution supersedes conflicting implementation preferences and lower-level planning
documents. Amendments MUST be documented here with a Sync Impact Report and reviewed before dependent
specifications are changed. Semantic versioning applies: MAJOR for incompatible principle changes or
removals, MINOR for new principles or materially expanded governance, and PATCH for clarifications.

Every Spec Kit plan MUST include a constitution check before and after design. Every task list MUST
contain the tests and quality gates required by these principles. Every implementation review MUST
verify compliance; unjustified complexity or skipped tests block completion.

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
