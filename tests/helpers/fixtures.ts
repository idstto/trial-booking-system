import type { SqlClient } from "@/infrastructure/db/client";

export async function createBaseFixture(sql: SqlClient) {
  const [parent] = await sql`
    INSERT INTO parents (id, name, email)
    VALUES ('10000000-0000-4000-8000-000000000001', 'Demo Parent', 'demo@example.test')
    RETURNING id
  `;
  const [student] = await sql`
    INSERT INTO students (parent_id, name) VALUES (${parent!.id}, 'Demo Child')
    RETURNING id
  `;
  const [otherStudent] = await sql`
    INSERT INTO students (parent_id, name) VALUES (${parent!.id}, 'Other Child')
    RETURNING id
  `;
  const [trialClass] = await sql`
    INSERT INTO trial_classes (title, starts_at, capacity)
    VALUES ('Open Class', '2026-10-01T02:00:00Z', 4)
    RETURNING id
  `;
  const [fullClass] = await sql`
    INSERT INTO trial_classes (title, starts_at, capacity)
    VALUES ('Full Class', '2026-10-02T02:00:00Z', 1)
    RETURNING id
  `;
  const [seatHolder] = await sql`
    INSERT INTO students (parent_id, name) VALUES (${parent!.id}, 'Seat Holder')
    RETURNING id
  `;
  await sql`
    INSERT INTO bookings
      (student_id, trial_class_id, status, request_key, request_fingerprint, confirmed_at)
    VALUES (${seatHolder!.id}, ${fullClass!.id}, 'confirmed', 'fixture-full-seat', 'fixture', now())
  `;

  return {
    parentId: parent!.id as string,
    studentId: student!.id as string,
    otherStudentId: otherStudent!.id as string,
    trialClassId: trialClass!.id as string,
    fullClassId: fullClass!.id as string,
  };
}
