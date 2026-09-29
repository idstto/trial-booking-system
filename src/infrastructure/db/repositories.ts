import type {
  BookingRepository,
  BookingUnitOfWork,
  CreatePaymentAttemptRecord,
  CreatePendingBookingRecord,
  RosterEntry,
  StoredPaymentAttempt,
  StudentSummary,
  TrialClassSummary,
} from "@/application/ports";
import type { BookingRecord, BookingStatus } from "@/domain/booking";
import type { SqlClient } from "@/infrastructure/db/client";

type BookingRow = BookingRecord & { requestFingerprint: string };

export class PostgresBookingRepository implements BookingRepository {
  constructor(private readonly sql: SqlClient) {}

  async listStudents(parentId: string): Promise<StudentSummary[]> {
    return this.sql<StudentSummary[]>`
      SELECT id, name FROM students WHERE parent_id = ${parentId} ORDER BY name
    `;
  }

  async listTrialClasses(): Promise<TrialClassSummary[]> {
    return this.sql<TrialClassSummary[]>`
      SELECT
        c.id,
        c.title,
        c.starts_at,
        c.capacity::int,
        count(b.id) FILTER (WHERE b.status = 'confirmed')::int AS confirmed_count,
        greatest(c.capacity - count(b.id) FILTER (WHERE b.status = 'confirmed'), 0)::int AS available_seats
      FROM trial_classes c
      LEFT JOIN bookings b ON b.trial_class_id = c.id
      GROUP BY c.id
      ORDER BY c.starts_at, c.id
    `;
  }

  async studentBelongsToParent(studentId: string, parentId: string): Promise<boolean> {
    const [row] = await this
      .sql`SELECT 1 FROM students WHERE id = ${studentId} AND parent_id = ${parentId}`;
    return Boolean(row);
  }

  async trialClassExists(trialClassId: string): Promise<boolean> {
    const [row] = await this.sql`SELECT 1 FROM trial_classes WHERE id = ${trialClassId}`;
    return Boolean(row);
  }

  async findBookingById(bookingId: string, parentId: string): Promise<BookingRecord | null> {
    const [row] = await this.sql<BookingRow[]>`
      SELECT b.* FROM bookings b
      JOIN students s ON s.id = b.student_id
      WHERE b.id = ${bookingId} AND s.parent_id = ${parentId}
    `;
    return row ?? null;
  }

  async lockBookingById(bookingId: string, parentId: string): Promise<BookingRecord | null> {
    const [row] = await this.sql<BookingRow[]>`
      SELECT b.* FROM bookings b
      JOIN students s ON s.id = b.student_id
      WHERE b.id = ${bookingId} AND s.parent_id = ${parentId}
      FOR UPDATE OF b
    `;
    return row ?? null;
  }

  async findBookingByRequestKey(requestKey: string): Promise<BookingRow | null> {
    const [row] = await this.sql<BookingRow[]>`
      SELECT * FROM bookings WHERE request_key = ${requestKey}
    `;
    return row ?? null;
  }

  async findActiveBooking(studentId: string, trialClassId: string): Promise<BookingRecord | null> {
    const [row] = await this.sql<BookingRow[]>`
      SELECT * FROM bookings
      WHERE student_id = ${studentId} AND trial_class_id = ${trialClassId}
        AND status IN ('pending_payment', 'confirmed')
      LIMIT 1
    `;
    return row ?? null;
  }

  async createPendingBooking(input: CreatePendingBookingRecord): Promise<BookingRecord | null> {
    const [row] = await this.sql<BookingRow[]>`
      INSERT INTO bookings
        (student_id, trial_class_id, status, request_key, request_fingerprint)
      VALUES
        (${input.studentId}, ${input.trialClassId}, 'pending_payment', ${input.requestKey}, ${input.requestFingerprint})
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    return row ?? null;
  }

  async findPaymentAttempt(idempotencyKey: string): Promise<StoredPaymentAttempt | null> {
    const [row] = await this.sql<StoredPaymentAttempt[]>`
      SELECT id, booking_id, idempotency_key, request_fingerprint, result, booking_status
      FROM payment_attempts WHERE idempotency_key = ${idempotencyKey}
    `;
    return row ?? null;
  }

  async lockTrialClass(trialClassId: string): Promise<{ id: string; capacity: number } | null> {
    const [row] = await this.sql<{ id: string; capacity: number }[]>`
      SELECT id, capacity::int FROM trial_classes WHERE id = ${trialClassId} FOR UPDATE
    `;
    return row ?? null;
  }

  async countConfirmed(trialClassId: string): Promise<number> {
    const [row] = await this.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings
      WHERE trial_class_id = ${trialClassId} AND status = 'confirmed'
    `;
    return row!.count;
  }

  async createPaymentAttempt(input: CreatePaymentAttemptRecord): Promise<StoredPaymentAttempt> {
    const [row] = await this.sql<StoredPaymentAttempt[]>`
      INSERT INTO payment_attempts
        (booking_id, idempotency_key, request_fingerprint, result, amount_minor, booking_status)
      VALUES
        (${input.bookingId}, ${input.idempotencyKey}, ${input.requestFingerprint}, ${input.result}, ${input.amountMinor}, ${input.bookingStatus})
      RETURNING id, booking_id, idempotency_key, request_fingerprint, result, booking_status
    `;
    return row!;
  }

  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<BookingRecord> {
    const [row] = await this.sql<BookingRow[]>`
      UPDATE bookings
      SET
        status = ${status},
        updated_at = now(),
        confirmed_at = CASE WHEN ${status} = 'confirmed' THEN now() ELSE NULL END
      WHERE id = ${bookingId}
      RETURNING *
    `;
    return row!;
  }

  async listRoster(trialClassId: string): Promise<RosterEntry[]> {
    return this.sql<RosterEntry[]>`
      SELECT b.id AS booking_id, s.id AS student_id, s.name AS student_name, b.confirmed_at
      FROM bookings b
      JOIN students s ON s.id = b.student_id
      WHERE b.trial_class_id = ${trialClassId} AND b.status = 'confirmed'
      ORDER BY b.confirmed_at, b.id
    `;
  }
}

export class PostgresBookingUnitOfWork implements BookingUnitOfWork {
  constructor(private readonly sql: SqlClient) {}

  async run<T>(work: (repository: BookingRepository) => Promise<T>): Promise<T> {
    return (await this.sql.begin(async (transaction) =>
      work(new PostgresBookingRepository(transaction as unknown as SqlClient)),
    )) as T;
  }
}
