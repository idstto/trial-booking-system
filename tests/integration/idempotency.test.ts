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

describe("command idempotency", () => {
  it("returns the same booking for an exact creation replay", async () => {
    const fixture = await createBaseFixture(sql);
    const command = {
      parentId: fixture.parentId,
      studentId: fixture.studentId,
      trialClassId: fixture.trialClassId,
      requestKey: "create-exact-replay",
    };

    const first = await service.createBooking(command);
    const replay = await service.createBooking(command);

    expect(replay.id).toBe(first.id);
    const [row] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings WHERE request_key = ${command.requestKey}
    `;
    expect(row!.count).toBe(1);
  });

  it("rejects creation key reuse with a different payload", async () => {
    const fixture = await createBaseFixture(sql);
    await service.createBooking({
      parentId: fixture.parentId,
      studentId: fixture.studentId,
      trialClassId: fixture.trialClassId,
      requestKey: "create-conflict-key",
    });

    await expect(
      service.createBooking({
        parentId: fixture.parentId,
        studentId: fixture.otherStudentId,
        trialClassId: fixture.trialClassId,
        requestKey: "create-conflict-key",
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<DomainError>>({ code: "IDEMPOTENCY_CONFLICT" }));
  });

  it("returns the same terminal outcome for an exact payment replay", async () => {
    const fixture = await createBaseFixture(sql);
    const booking = await service.createBooking({
      ...fixture,
      requestKey: "payment-replay-create",
    });
    const command = {
      parentId: fixture.parentId,
      bookingId: booking.id,
      idempotencyKey: "payment-exact-replay",
      result: "succeeded" as const,
    };

    const first = await service.applyPaymentResult(command);
    const replay = await service.applyPaymentResult(command);

    expect(replay).toEqual(first);
    const [row] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM payment_attempts
      WHERE idempotency_key = ${command.idempotencyKey}
    `;
    expect(row!.count).toBe(1);
  });

  it("rejects payment key reuse with a different result", async () => {
    const fixture = await createBaseFixture(sql);
    const booking = await service.createBooking({ ...fixture, requestKey: "payment-conflict-create" });
    await service.applyPaymentResult({
      parentId: fixture.parentId,
      bookingId: booking.id,
      idempotencyKey: "payment-conflict-key",
      result: "failed",
    });

    await expect(
      service.applyPaymentResult({
        parentId: fixture.parentId,
        bookingId: booking.id,
        idempotencyKey: "payment-conflict-key",
        result: "succeeded",
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<DomainError>>({ code: "IDEMPOTENCY_CONFLICT" }));
  });

  it("allows only one concurrent active booking", async () => {
    const fixture = await createBaseFixture(sql);
    const results = await Promise.allSettled([
      service.createBooking({ ...fixture, requestKey: "concurrent-create-one" }),
      service.createBooking({ ...fixture, requestKey: "concurrent-create-two" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const [row] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings
      WHERE student_id = ${fixture.studentId} AND trial_class_id = ${fixture.trialClassId}
        AND status IN ('pending_payment', 'confirmed')
    `;
    expect(row!.count).toBe(1);
  });
});
