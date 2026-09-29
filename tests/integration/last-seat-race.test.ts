import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BookingService } from "@/application/booking-service";
import { PostgresBookingUnitOfWork } from "@/infrastructure/db/repositories";

import { createTestClient, migrateTestDatabase, resetTestDatabase } from "../helpers/database";
import { createBaseFixture } from "../helpers/fixtures";

const setupSql = createTestClient();
const connectionOne = createTestClient(1);
const connectionTwo = createTestClient(1);
const serviceOne = new BookingService(new PostgresBookingUnitOfWork(connectionOne));
const serviceTwo = new BookingService(new PostgresBookingUnitOfWork(connectionTwo));

beforeAll(() => migrateTestDatabase(setupSql));
beforeEach(() => resetTestDatabase(setupSql));
afterAll(async () => {
  await Promise.all([setupSql.end(), connectionOne.end(), connectionTwo.end()]);
});

describe("capacity concurrency", () => {
  it("confirms exactly one contender for the final seat", async () => {
    const fixture = await createBaseFixture(setupSql);
    const [classRow] = await setupSql`
      INSERT INTO trial_classes (title, starts_at, capacity)
      VALUES ('Last Seat', now(), 1) RETURNING id
    `;
    const bookingOne = await serviceOne.createBooking({
      parentId: fixture.parentId,
      studentId: fixture.studentId,
      trialClassId: classRow!.id,
      requestKey: "race-create-one",
    });
    const bookingTwo = await serviceTwo.createBooking({
      parentId: fixture.parentId,
      studentId: fixture.otherStudentId,
      trialClassId: classRow!.id,
      requestKey: "race-create-two",
    });

    let release!: () => void;
    const barrier = new Promise<void>((resolve) => (release = resolve));
    const attempts = [
      (async () => {
        await barrier;
        return serviceOne.applyPaymentResult({
          parentId: fixture.parentId,
          bookingId: bookingOne.id,
          idempotencyKey: "race-payment-one",
          result: "succeeded",
        });
      })(),
      (async () => {
        await barrier;
        return serviceTwo.applyPaymentResult({
          parentId: fixture.parentId,
          bookingId: bookingTwo.id,
          idempotencyKey: "race-payment-two",
          result: "succeeded",
        });
      })(),
    ];
    release();

    const outcomes = (await Promise.all(attempts)).map((booking) => booking.status).sort();
    expect(outcomes).toEqual(["capacity_unavailable", "confirmed"]);
    const [row] = await setupSql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings
      WHERE trial_class_id = ${classRow!.id} AND status = 'confirmed'
    `;
    expect(row!.count).toBe(1);
  });

  it("does not serialize capacity across unrelated classes", async () => {
    const fixture = await createBaseFixture(setupSql);
    const [otherClass] = await setupSql`
      INSERT INTO trial_classes (title, starts_at, capacity)
      VALUES ('Independent Class', now(), 1) RETURNING id
    `;
    const bookingOne = await serviceOne.createBooking({
      ...fixture,
      requestKey: "independent-create-one",
    });
    const bookingTwo = await serviceTwo.createBooking({
      parentId: fixture.parentId,
      studentId: fixture.otherStudentId,
      trialClassId: otherClass!.id,
      requestKey: "independent-create-two",
    });

    const results = await Promise.all([
      serviceOne.applyPaymentResult({
        parentId: fixture.parentId,
        bookingId: bookingOne.id,
        idempotencyKey: "independent-payment-one",
        result: "succeeded",
      }),
      serviceTwo.applyPaymentResult({
        parentId: fixture.parentId,
        bookingId: bookingTwo.id,
        idempotencyKey: "independent-payment-two",
        result: "succeeded",
      }),
    ]);

    expect(results.map((booking) => booking.status)).toEqual(["confirmed", "confirmed"]);
  });
});
