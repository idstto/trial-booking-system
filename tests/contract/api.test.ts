import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { POST as createBooking } from "@/app/api/bookings/route";
import { GET as getBooking } from "@/app/api/bookings/[bookingId]/route";
import { POST as applyPayment } from "@/app/api/bookings/[bookingId]/payment-result/route";
import { GET as listStudents } from "@/app/api/students/route";
import { GET as listClasses } from "@/app/api/trial-classes/route";
import { GET as getRoster } from "@/app/api/trial-classes/[classId]/roster/route";

import { createTestClient, migrateTestDatabase, resetTestDatabase } from "../helpers/database";
import { createBaseFixture } from "../helpers/fixtures";

const sql = createTestClient();

beforeAll(() => migrateTestDatabase(sql));
beforeEach(() => resetTestDatabase(sql));
afterAll(() => sql.end());

describe("trial booking HTTP contract", () => {
  it("lists seeded-parent students and trial classes", async () => {
    const fixture = await createBaseFixture(sql);

    const studentsResponse = await listStudents();
    const classesResponse = await listClasses();

    expect(studentsResponse.status).toBe(200);
    expect(await studentsResponse.json()).toMatchObject({
      data: expect.arrayContaining([expect.objectContaining({ id: fixture.studentId })]),
      requestId: expect.any(String),
    });
    expect(classesResponse.status).toBe(200);
    expect(await classesResponse.json()).toMatchObject({
      data: expect.arrayContaining([expect.objectContaining({ id: fixture.trialClassId })]),
      requestId: expect.any(String),
    });
  });

  it("creates, pays, and retrieves a booking", async () => {
    const fixture = await createBaseFixture(sql);
    const createResponse = await createBooking(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "contract-create-key" },
        body: JSON.stringify({
          studentId: fixture.studentId,
          trialClassId: fixture.trialClassId,
        }),
      }),
    );
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.data.status).toBe("pending_payment");

    const paymentResponse = await applyPayment(
      new Request(`http://localhost/api/bookings/${created.data.id}/payment-result`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "contract-payment-key" },
        body: JSON.stringify({ result: "succeeded" }),
      }),
      { params: Promise.resolve({ bookingId: created.data.id }) },
    );
    expect(paymentResponse.status).toBe(200);
    expect((await paymentResponse.json()).data.status).toBe("confirmed");

    const statusResponse = await getBooking(new Request("http://localhost"), {
      params: Promise.resolve({ bookingId: created.data.id }),
    });
    expect(statusResponse.status).toBe(200);
    expect((await statusResponse.json()).data.status).toBe("confirmed");
  });

  it("returns a stable validation envelope", async () => {
    await createBaseFixture(sql);
    const response = await createBooking(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: "bad", trialClassId: "bad" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
      requestId: expect.any(String),
    });
  });

  it("rejects unknown booking request fields", async () => {
    const fixture = await createBaseFixture(sql);
    const response = await createBooking(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "strict-create-key" },
        body: JSON.stringify({
          studentId: fixture.studentId,
          trialClassId: fixture.trialClassId,
          unexpected: true,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
      requestId: expect.any(String),
    });
    const [row] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM bookings WHERE request_key = 'strict-create-key'
    `;
    expect(row!.count).toBe(0);
  });

  it("rejects unknown payment-result request fields", async () => {
    const fixture = await createBaseFixture(sql);
    const createResponse = await createBooking(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "strict-payment-create" },
        body: JSON.stringify({
          studentId: fixture.studentId,
          trialClassId: fixture.trialClassId,
        }),
      }),
    );
    const created = await createResponse.json();

    const response = await applyPayment(
      new Request(`http://localhost/api/bookings/${created.data.id}/payment-result`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "strict-payment-key" },
        body: JSON.stringify({ result: "succeeded", unexpected: true }),
      }),
      { params: Promise.resolve({ bookingId: created.data.id }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
      requestId: expect.any(String),
    });
    const [bookingRow] = await sql<{ status: string }[]>`
      SELECT status FROM bookings WHERE id = ${created.data.id}
    `;
    const [attemptRow] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM payment_attempts WHERE booking_id = ${created.data.id}
    `;
    expect(bookingRow!.status).toBe("pending_payment");
    expect(attemptRow!.count).toBe(0);
  });

  it("returns a confirmed-only class roster", async () => {
    const fixture = await createBaseFixture(sql);
    await sql`
      INSERT INTO bookings
        (student_id, trial_class_id, status, request_key, request_fingerprint, confirmed_at)
      VALUES
        (${fixture.studentId}, ${fixture.trialClassId}, 'confirmed', 'contract-roster-confirmed', 'one', now()),
        (${fixture.otherStudentId}, ${fixture.trialClassId}, 'payment_failed', 'contract-roster-failed', 'two', NULL)
    `;

    const response = await getRoster(new Request("http://localhost"), {
      params: Promise.resolve({ classId: fixture.trialClassId }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ studentId: fixture.studentId });
  });
});
