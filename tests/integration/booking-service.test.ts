import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BookingService } from "@/application/booking-service";
import { DomainError } from "@/domain/errors";
import { PostgresBookingUnitOfWork } from "@/infrastructure/db/repositories";

import { createTestClient, migrateTestDatabase, resetTestDatabase } from "../helpers/database";
import { createBaseFixture } from "../helpers/fixtures";

const sql = createTestClient();
const service = new BookingService(new PostgresBookingUnitOfWork(sql));

beforeAll(() => migrateTestDatabase(sql));
beforeEach(() => resetTestDatabase(sql));
afterAll(() => sql.end());

describe("BookingService", () => {
  it("confirms a paid booking when capacity remains", async () => {
    const fixture = await createBaseFixture(sql);
    const booking = await service.createBooking({
      ...fixture,
      requestKey: "service-happy-create",
    });

    const result = await service.applyPaymentResult({
      parentId: fixture.parentId,
      bookingId: booking.id,
      idempotencyKey: "service-happy-payment",
      result: "succeeded",
    });

    expect(result.status).toBe("confirmed");
    expect(result.confirmedAt).toBeInstanceOf(Date);
    const [countRow] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings
      WHERE trial_class_id = ${fixture.trialClassId} AND status = 'confirmed'
    `;
    expect(countRow!.count).toBe(1);
  });

  it("records failure without changing the roster", async () => {
    const fixture = await createBaseFixture(sql);
    const booking = await service.createBooking({
      ...fixture,
      requestKey: "service-failed-create",
    });

    const result = await service.applyPaymentResult({
      parentId: fixture.parentId,
      bookingId: booking.id,
      idempotencyKey: "service-failed-payment",
      result: "failed",
    });

    expect(result.status).toBe("payment_failed");
    const [countRow] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings
      WHERE trial_class_id = ${fixture.trialClassId} AND status = 'confirmed'
    `;
    expect(countRow!.count).toBe(0);
  });

  it("records capacity unavailable after a successful payment for a full class", async () => {
    const fixture = await createBaseFixture(sql);
    const booking = await service.createBooking({
      parentId: fixture.parentId,
      studentId: fixture.studentId,
      trialClassId: fixture.fullClassId,
      requestKey: "service-full-create",
    });

    const result = await service.applyPaymentResult({
      parentId: fixture.parentId,
      bookingId: booking.id,
      idempotencyKey: "service-full-payment",
      result: "succeeded",
    });

    expect(result.status).toBe("capacity_unavailable");
    const [occupancy] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings
      WHERE trial_class_id = ${fixture.fullClassId} AND status = 'confirmed'
    `;
    const [attempt] = await sql<{ result: string; bookingStatus: string; bookingId: string }[]>`
      SELECT result, booking_status, booking_id FROM payment_attempts
      WHERE idempotency_key = 'service-full-payment'
    `;
    expect(occupancy!.count).toBe(1);
    expect(attempt).toEqual({
      result: "succeeded",
      bookingStatus: "capacity_unavailable",
      bookingId: booking.id,
    });
  });

  it("rejects missing students and classes with stable domain errors", async () => {
    const fixture = await createBaseFixture(sql);
    await expect(
      service.createBooking({
        parentId: fixture.parentId,
        studentId: "00000000-0000-4000-8000-000000000099",
        trialClassId: fixture.trialClassId,
        requestKey: "service-missing-student",
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<DomainError>>({ code: "STUDENT_NOT_FOUND" }));

    await expect(
      service.createBooking({
        parentId: fixture.parentId,
        studentId: fixture.studentId,
        trialClassId: "00000000-0000-4000-8000-000000000099",
        requestKey: "service-missing-class",
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<DomainError>>({ code: "CLASS_NOT_FOUND" }));
  });

  it("rejects a second payment result for a terminal booking", async () => {
    const fixture = await createBaseFixture(sql);
    const booking = await service.createBooking({
      ...fixture,
      requestKey: "service-terminal-create",
    });
    await service.applyPaymentResult({
      parentId: fixture.parentId,
      bookingId: booking.id,
      idempotencyKey: "service-terminal-first",
      result: "failed",
    });

    await expect(
      service.applyPaymentResult({
        parentId: fixture.parentId,
        bookingId: booking.id,
        idempotencyKey: "service-terminal-second",
        result: "succeeded",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DomainError>>({ code: "INVALID_BOOKING_TRANSITION" }),
    );
  });
});
