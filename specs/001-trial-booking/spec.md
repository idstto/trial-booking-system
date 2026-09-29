# Feature Specification: Trial Class Booking

**Feature Branch**: `feature/trial-booking`

**Created**: 2026-09-29

**Status**: Approved for planning

**Input**: User description: "Translate the approved trial-booking documentation to Spec Kit and
implement it using TDD, SOLID principles, and best practices."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Parent books and pays for a trial class (Priority: P1)

A parent selects one of their children and a trial class, creates a booking, submits a simulated
payment result, and sees the final booking status.

**Why this priority**: This is the primary user value and the smallest complete booking journey.

**Independent Test**: With seeded parent, child, and class data, a reviewer can create one booking,
record a successful payment, see `confirmed`, and find the child exactly once on the class roster.

**Acceptance Scenarios**:

1. **Given** a class has remaining capacity and the child has no active booking, **When** the parent
   creates a booking and records a successful payment, **Then** the booking is confirmed and occupies
   exactly one seat.
2. **Given** a pending booking, **When** the simulated payment fails, **Then** the booking becomes
   payment failed and does not occupy a seat.
3. **Given** a class is already full, **When** a pending booking records a successful payment,
   **Then** the booking reports capacity unavailable and confirmed occupancy does not change.

---

### User Story 2 - Parent receives stable results under retries and competition (Priority: P1)

A parent can safely retry commands without duplicate bookings or payment effects, and receives an
honest outcome if another child obtains the final seat first.

**Why this priority**: The exercise explicitly evaluates duplicate protection and the final-seat race;
both are correctness requirements, not optional enhancements.

**Independent Test**: Replaying the same booking and payment commands creates one effective result;
simultaneously completing two paid bookings for one remaining seat confirms exactly one.

**Acceptance Scenarios**:

1. **Given** a child already has a pending or confirmed booking for a class, **When** another active
   booking is requested, **Then** no second active booking is created.
2. **Given** a booking or payment command has already completed, **When** the same command is replayed
   with the same key and payload, **Then** the stored result is returned without an additional effect.
3. **Given** a class has one seat left and two children have pending bookings, **When** both successful
   payment results are processed concurrently, **Then** exactly one booking is confirmed, the other is
   capacity unavailable, and confirmed occupancy equals capacity.
4. **Given** an existing command key, **When** it is reused with a different payload, **Then** the
   command is rejected and existing state is unchanged.

---

### User Story 3 - Staff views an accurate confirmed roster (Priority: P2)

An administrator or teacher selects a trial class and sees only the children whose bookings are
confirmed.

**Why this priority**: The roster is the operational outcome of booking and proves failed or losing
bookings do not pollute attendance data.

**Independent Test**: Seed or create bookings in every supported status, request the class roster,
and verify that it contains each confirmed child exactly once and no other child.

**Acceptance Scenarios**:

1. **Given** a class has bookings in confirmed and non-confirmed statuses, **When** staff opens its
   roster, **Then** only confirmed children are listed.
2. **Given** a payment fails or loses the final-seat race, **When** staff refreshes the roster,
   **Then** that child is absent and the confirmed count never exceeds class capacity.

### Edge Cases

- Two confirmation attempts for the same class begin at nearly the same time.
- Two active booking requests for the same child and class arrive concurrently.
- A payment-result command is delivered repeatedly or reuses its key with a different payload.
- A payment result targets a missing booking or a booking already in a terminal state.
- Availability changes after the parent views a class but before payment completes.
- A class has zero available seats, invalid stored capacity, or a booking references another parent’s
  child; the demo uses a seeded identity, while ownership enforcement is documented as production work.
- An unexpected persistence failure occurs during confirmation; no partial payment or booking state is
  committed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST list the children belonging to the seeded demo parent.
- **FR-002**: The system MUST list trial classes with schedule, capacity, confirmed count, and
  indicative remaining seats.
- **FR-003**: The system MUST create a pending booking for a selected child and trial class.
- **FR-004**: The system MUST record a simulated successful or failed payment result separately from
  the booking outcome.
- **FR-005**: The system MUST expose the current booking status using the agreed vocabulary:
  `pending_payment`, `confirmed`, `payment_failed`, `capacity_unavailable`, and `cancelled`.
- **FR-006**: The system MUST return a class roster containing confirmed bookings only.
- **FR-007**: The system MUST prevent more than one active booking for the same child and class,
  including under concurrent requests.
- **FR-008**: The system MUST prevent confirmed occupancy from exceeding the class’s stored capacity.
- **FR-009**: When simultaneous payment successes compete for the final seat, the system MUST confirm
  at most one and give every request a stable final outcome.
- **FR-010**: Booking creation and payment-result commands MUST be idempotent for a stable command key
  and payload.
- **FR-011**: Reusing a command key with a different payload MUST produce a conflict without changing
  existing state.
- **FR-012**: A failed payment MUST NOT confirm a booking or add a child to the roster.
- **FR-013**: A successful payment that cannot obtain capacity MUST retain an auditable outcome and
  tell the parent that the class became unavailable.
- **FR-014**: All user-visible failures MUST have stable error codes and understandable messages.
- **FR-015**: The demo MUST include synthetic seed data for ordinary availability, a final-seat case,
  a duplicate case, and a payment-failure case.

### Key Entities _(include if feature involves data)_

- **Parent**: The adult using the seeded demo identity; owns one or more children.
- **Student**: A child eligible for a trial booking and belonging to one parent.
- **Trial Class**: A scheduled class with a positive capacity and confirmed roster.
- **Booking**: A child’s attempt to join one trial class, including its lifecycle status and command
  identity.
- **Payment Attempt**: An auditable simulated payment result associated with one booking and one
  idempotency key.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A reviewer can complete the seeded successful booking journey and see the updated roster
  in under two minutes.
- **SC-002**: In 100 repeated final-seat race trials, every trial ends with exactly one winner and
  confirmed occupancy equal to, never greater than, capacity.
- **SC-003**: Every required acceptance scenario has at least one automated verification, and all
  verification passes from a documented fresh setup.
- **SC-004**: Replaying the same booking or payment command 10 times produces exactly one effective
  booking or payment result.
- **SC-005**: Across a mixed-status fixture, 100% of roster entries are confirmed and 0% of
  non-confirmed bookings appear.
- **SC-006**: A reviewer can identify the ownership of UI, transport, application, persistence, and
  database responsibilities from the project structure and documentation in under five minutes.

## Assumptions

- The demo uses one trusted seeded parent identity; complete authentication and role management are
  outside this feature.
- Availability shown before confirmation is advisory and may change.
- Only confirmed bookings consume capacity.
- Trial class capacity is stored per class and seeded as four for demonstration.
- All timestamps use UTC and all sample people are synthetic.
- Payment is simulated locally; production authorization, capture, void/refund, and reconciliation are
  documented but not implemented.
- The feature is delivered as one deployable application with one authoritative relational database.
- A distributed Saga, Kafka, regular enrollment, notifications, and full GitFlow are outside scope.
