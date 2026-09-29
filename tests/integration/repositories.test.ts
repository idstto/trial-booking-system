import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresBookingRepository } from "@/infrastructure/db/repositories";

import { createTestClient, migrateTestDatabase, resetTestDatabase } from "../helpers/database";
import { createBaseFixture } from "../helpers/fixtures";

const sql = createTestClient();

beforeAll(() => migrateTestDatabase(sql));
beforeEach(() => resetTestDatabase(sql));
afterAll(() => sql.end());

describe("PostgresBookingRepository", () => {
  it("lists advisory availability from confirmed bookings", async () => {
    const fixture = await createBaseFixture(sql);
    const repository = new PostgresBookingRepository(sql);

    const classes = await repository.listTrialClasses();

    expect(classes.find((item) => item.id === fixture.trialClassId)).toMatchObject({
      capacity: 4,
      confirmedCount: 0,
      availableSeats: 4,
    });
    expect(classes.find((item) => item.id === fixture.fullClassId)).toMatchObject({
      capacity: 1,
      confirmedCount: 1,
      availableSeats: 0,
    });
  });

  it("persists a pending booking and its successful payment audit outcome", async () => {
    const fixture = await createBaseFixture(sql);
    const repository = new PostgresBookingRepository(sql);
    const booking = await repository.createPendingBooking({
      studentId: fixture.studentId,
      trialClassId: fixture.trialClassId,
      requestKey: "repository-create-key",
      requestFingerprint: "fingerprint",
    });

    await repository.createPaymentAttempt({
      bookingId: booking.id,
      idempotencyKey: "repository-payment-key",
      requestFingerprint: "payment-fingerprint",
      result: "succeeded",
      bookingStatus: "confirmed",
      amountMinor: 2500,
    });

    const [attempt] = await sql`
      SELECT result, booking_status, amount_minor FROM payment_attempts WHERE booking_id = ${booking.id}
    `;
    expect(attempt).toEqual({
      result: "succeeded",
      bookingStatus: "confirmed",
      amountMinor: 2500,
    });
  });
});
