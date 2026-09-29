# Flowcharts

These Mermaid diagrams are documentation artifacts; they do not prescribe a particular framework.

## System context

```mermaid
flowchart LR
    Parent[Parent] --> UI[Minimal booking UI]
    Staff[Admin or teacher] --> UI
    UI --> API[Web API and booking service]
    API --> DB[(PostgreSQL)]
    API --> Mock[Mock payment adapter]
    Mock --> API
    DB --> API
    API --> UI
```

## Happy path and payment failure

```mermaid
flowchart TD
    A[Select child and trial class] --> B[POST booking with idempotency key]
    B --> C{Active booking already exists?}
    C -- Yes --> D[Return existing booking or conflict]
    C -- No --> E[Create pending_payment]
    E --> F[Submit mock payment result]
    F --> G{Payment succeeded?}
    G -- No --> H[Record failed attempt]
    H --> I[Set payment_failed]
    G -- Yes --> J[Run atomic confirmation]
    J --> K{Seat available under class lock?}
    K -- Yes --> L[Set confirmed]
    K -- No --> M[Set capacity_unavailable]
    L --> N[Appears on roster]
    I --> O[Does not appear on roster]
    M --> O
```

## Last-seat race sequence

```mermaid
sequenceDiagram
    participant A as User A
    participant B as User B
    participant S as Booking service
    participant D as PostgreSQL

    Note over D: Class has 3 confirmed bookings
    A->>S: Payment success for booking A
    B->>S: Payment success for booking B
    par Competing transactions
        S->>D: Tx A: lock class row
        D-->>S: Lock granted
    and
        S->>D: Tx B: lock class row
        D-->>S: Wait
    end
    S->>D: Tx A counts 3 and confirms A
    S->>D: Tx A commits
    D-->>S: Tx B lock granted
    S->>D: Tx B counts 4
    S->>D: Tx B sets capacity_unavailable and commits
    S-->>A: confirmed
    S-->>B: capacity_unavailable
    Note over D: Final confirmed count = 4
```

The winner may be A or B. The invariant is that exactly one wins.

## Booking state machine

```mermaid
stateDiagram-v2
    [*] --> pending_payment: create booking
    pending_payment --> confirmed: payment succeeds and seat acquired
    pending_payment --> payment_failed: payment fails
    pending_payment --> capacity_unavailable: payment succeeds but class is full
    pending_payment --> cancelled: cancellation or expiry
    confirmed --> cancelled: optional future cancellation
    payment_failed --> [*]
    capacity_unavailable --> [*]
    cancelled --> [*]
```

For the demo, terminal states reject contradictory later payment results. A new booking may be created after a failed, unavailable, or cancelled booking.

## Authority by layer

```mermaid
flowchart TB
    UI[UI checks<br/>labels, required fields, disable double-click<br/>advisory availability]
    API[Backend checks<br/>identity, ownership, input, transitions<br/>idempotency semantics]
    DB[Database guarantees<br/>transactions, class row lock<br/>unique active booking constraint]
    JOB[Background jobs - future<br/>expire pending bookings<br/>reconcile refunds and stale payments]
    UI --> API --> DB
    DB -. events needing recovery .-> JOB
```

## Payment-to-seat decision

```mermaid
flowchart TD
    A[Receive payment result] --> B{Idempotency key seen?}
    B -- Yes --> C[Return recorded outcome]
    B -- No --> D{Booking still pending?}
    D -- No --> E[Reject invalid transition]
    D -- Yes --> F{Result failed?}
    F -- Yes --> G[Record failure and mark payment_failed]
    F -- No --> H[Begin transaction and lock class]
    H --> I{Confirmed count below capacity?}
    I -- Yes --> J[Record success and mark confirmed]
    I -- No --> K[Record success and mark capacity_unavailable]
    J --> L[Commit]
    K --> L
```

## Production evolution: Saga-like compensation and optional event streaming

```mermaid
flowchart TD
    A[Authorize payment] --> B[Atomically claim seat]
    B --> C{Seat acquired?}
    C -- No --> D[Void authorization]
    D --> E{Void confirmed?}
    E -- No --> F[Queue reconciliation]
    C -- Yes --> G[Write confirmation and outbox event]
    G --> H[Capture payment]
    H --> I{Capture confirmed?}
    I -- No --> F
    I -- Yes --> J[Outbox publisher]
    J --> K[Message broker]
    K --> L[Notification consumer]
    K --> M[Analytics consumer]
    K --> N[Audit consumer]
```

The implemented take-home stops at the synchronous database-backed flow shown earlier. This production diagram is intentionally future-facing. The broker is not assumed to be Kafka; Kafka becomes a candidate only when replay, throughput, ordering, retention, and independent-consumer requirements justify it.
