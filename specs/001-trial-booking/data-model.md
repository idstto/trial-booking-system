# Data Model: Trial Class Booking

## Parent

- `id`: UUID, primary key
- `name`: non-empty text
- `email`: normalized, unique text
- `created_at`: UTC timestamp

One parent owns many students. The demo identity selects one seeded parent server-side.

## Student

- `id`: UUID, primary key
- `parent_id`: required foreign key to Parent
- `name`: non-empty text
- `created_at`: UTC timestamp

A student may have bookings for different classes, but at most one active booking per class.

## TrialClass

- `id`: UUID, primary key
- `title`: non-empty text
- `starts_at`: UTC timestamp
- `capacity`: positive small integer; demo records use `4`
- `created_at`: UTC timestamp

Availability is derived as `max(capacity - confirmed booking count, 0)` and is advisory.

## Booking

- `id`: UUID, primary key
- `student_id`: required foreign key to Student
- `trial_class_id`: required foreign key to TrialClass
- `status`: `pending_payment | confirmed | payment_failed | capacity_unavailable | cancelled`
- `request_key`: unique, non-empty booking command key
- `request_fingerprint`: deterministic hash of student and class command payload
- `created_at`, `updated_at`: UTC timestamps
- `confirmed_at`: nullable UTC timestamp, present only for confirmed bookings

### Booking constraints

- Partial unique index on `(student_id, trial_class_id)` where status is `pending_payment` or
  `confirmed`.
- `confirmed_at` is non-null exactly when status is `confirmed`.
- Only `pending_payment` may transition to a payment terminal outcome in this feature.

### Booking state transitions

```text
pending_payment -> confirmed
pending_payment -> payment_failed
pending_payment -> capacity_unavailable
pending_payment -> cancelled
```

Terminal states do not transition in the demo. An exact idempotent replay returns the stored state;
it does not execute another transition.

## PaymentAttempt

- `id`: UUID, primary key
- `booking_id`: required foreign key to Booking
- `idempotency_key`: unique, non-empty payment command key
- `request_fingerprint`: deterministic hash of booking, result, and amount
- `result`: `succeeded | failed`
- `amount_minor`: non-negative integer, fixed demo amount supplied server-side or validated
- `provider_reference`: nullable unique text
- `booking_status`: stored resulting booking status for deterministic replay
- `created_at`: UTC timestamp

PaymentAttempt is audit history, not proof of enrollment. A succeeded attempt may result in
`capacity_unavailable`.

## Relationships

```text
Parent 1 ── * Student
Student 1 ── * Booking * ── 1 TrialClass
Booking 1 ── * PaymentAttempt
```

## Transaction protocol

1. Lock the booking row and validate it belongs to the seeded parent’s student.
2. If the idempotency key exists, compare its fingerprint and return or reject deterministically.
3. Reject a non-pending booking unless this is the exact recorded replay.
4. For failure, record attempt and set `payment_failed` atomically.
5. For success, lock the class row, record the attempt, count confirmed bookings, then set
   `confirmed` or `capacity_unavailable` before committing.
