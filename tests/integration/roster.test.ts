import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BookingService } from "@/application/booking-service";
import { PostgresBookingUnitOfWork } from "@/infrastructure/db/repositories";

import { createTestClient, migrateTestDatabase, resetTestDatabase } from "../helpers/database";
import { createBaseFixture } from "../helpers/fixtures";

const sql = createTestClient();
const service = new BookingService(new PostgresBookingUnitOfWork(sql));

beforeAll(() => migrateTestDatabase(sql));
beforeEach(() => resetTestDatabase(sql));
afterAll(() => sql.end());

describe("confirmed roster", () => {
  it("returns confirmed students only", async () => {
    const fixture = await createBaseFixture(sql);
    const [confirmedStudent] = await sql`
      INSERT INTO students (parent_id, name) VALUES (${fixture.parentId}, 'Confirmed Child')
      RETURNING id
    `;
    const [failedStudent] = await sql`
      INSERT INTO students (parent_id, name) VALUES (${fixture.parentId}, 'Failed Child')
      RETURNING id
    `;
    await sql`
      INSERT INTO bookings
        (student_id, trial_class_id, status, request_key, request_fingerprint, confirmed_at)
      VALUES
        (${confirmedStudent!.id}, ${fixture.trialClassId}, 'confirmed', 'roster-confirmed-key', 'one', now()),
        (${failedStudent!.id}, ${fixture.trialClassId}, 'payment_failed', 'roster-failed-key', 'two', NULL),
        (${fixture.studentId}, ${fixture.trialClassId}, 'pending_payment', 'roster-pending-key', 'three', NULL),
        (${fixture.otherStudentId}, ${fixture.trialClassId}, 'capacity_unavailable', 'roster-capacity-key', 'four', NULL)
    `;

    const roster = await service.listRoster(fixture.trialClassId);

    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      studentId: confirmedStudent!.id,
      studentName: "Confirmed Child",
      confirmedAt: expect.any(Date),
    });
  });
});
