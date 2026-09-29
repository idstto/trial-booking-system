import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createTestClient,
  migrateTestDatabase,
  resetTestDatabase,
} from "../helpers/database";

const sql = createTestClient();

beforeAll(() => migrateTestDatabase(sql));
beforeEach(() => resetTestDatabase(sql));
afterAll(() => sql.end());

describe("database invariants", () => {
  it("rejects non-positive class capacity", async () => {
    await expect(
      sql`INSERT INTO trial_classes (title, starts_at, capacity) VALUES ('Invalid', now(), 0)`,
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects two active bookings for one student and class", async () => {
    const [parent] = await sql`
      INSERT INTO parents (name, email) VALUES ('Parent', 'parent@example.test') RETURNING id
    `;
    const [student] = await sql`
      INSERT INTO students (parent_id, name) VALUES (${parent!.id}, 'Child') RETURNING id
    `;
    const [trialClass] = await sql`
      INSERT INTO trial_classes (title, starts_at, capacity)
      VALUES ('Class', now(), 4) RETURNING id
    `;
    await sql`
      INSERT INTO bookings
        (student_id, trial_class_id, status, request_key, request_fingerprint)
      VALUES (${student!.id}, ${trialClass!.id}, 'pending_payment', 'request-key-one', 'one')
    `;

    await expect(sql`
      INSERT INTO bookings
        (student_id, trial_class_id, status, request_key, request_fingerprint)
      VALUES (${student!.id}, ${trialClass!.id}, 'pending_payment', 'request-key-two', 'two')
    `).rejects.toMatchObject({ code: "23505" });
  });

  it("requires confirmed_at exactly for confirmed bookings", async () => {
    const [parent] = await sql`
      INSERT INTO parents (name, email) VALUES ('Parent', 'confirmed@example.test') RETURNING id
    `;
    const [student] = await sql`
      INSERT INTO students (parent_id, name) VALUES (${parent!.id}, 'Child') RETURNING id
    `;
    const [trialClass] = await sql`
      INSERT INTO trial_classes (title, starts_at, capacity)
      VALUES ('Class', now(), 4) RETURNING id
    `;

    await expect(sql`
      INSERT INTO bookings
        (student_id, trial_class_id, status, request_key, request_fingerprint)
      VALUES (${student!.id}, ${trialClass!.id}, 'confirmed', 'request-confirmed', 'one')
    `).rejects.toMatchObject({ code: "23514" });
  });
});
