import "dotenv/config";

import { createSqlClient } from "../src/infrastructure/db/client";

export const seedIds = {
  demoParent: "10000000-0000-4000-8000-000000000001",
  secondParent: "10000000-0000-4000-8000-000000000002",
  students: [
    "20000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
    "20000000-0000-4000-8000-000000000003",
    "20000000-0000-4000-8000-000000000004",
    "20000000-0000-4000-8000-000000000005",
    "20000000-0000-4000-8000-000000000006",
  ],
  ordinaryClass: "30000000-0000-4000-8000-000000000001",
  lastSeatClass: "30000000-0000-4000-8000-000000000002",
  fullClass: "30000000-0000-4000-8000-000000000003",
} as const;

export async function seedDatabase(databaseUrl: string): Promise<void> {
  const sql = createSqlClient(databaseUrl, 1);
  const [s1, s2, s3, s4, s5, s6] = seedIds.students;

  try {
    await sql.begin(async (tx) => {
      await tx`TRUNCATE payment_attempts, bookings, students, trial_classes, parents CASCADE`;

      await tx`
        INSERT INTO parents (id, name, email) VALUES
        (${seedIds.demoParent}, 'Ari Parent', 'ari.parent@example.test'),
        (${seedIds.secondParent}, 'Bima Parent', 'bima.parent@example.test')
      `;
      await tx`
        INSERT INTO students (id, parent_id, name) VALUES
        (${s1}, ${seedIds.demoParent}, 'Maya'),
        (${s2}, ${seedIds.demoParent}, 'Noah'),
        (${s3}, ${seedIds.secondParent}, 'Alya'),
        (${s4}, ${seedIds.secondParent}, 'Ben'),
        (${s5}, ${seedIds.secondParent}, 'Citra'),
        (${s6}, ${seedIds.secondParent}, 'Dion')
      `;
      await tx`
        INSERT INTO trial_classes (id, title, starts_at, capacity) VALUES
        (${seedIds.ordinaryClass}, 'Creative Mathematics', '2026-10-05T02:00:00Z', 4),
        (${seedIds.lastSeatClass}, 'Junior Science Lab', '2026-10-06T03:00:00Z', 4),
        (${seedIds.fullClass}, 'English Story Club', '2026-10-07T04:00:00Z', 4)
      `;

      await tx`
        INSERT INTO bookings
          (id, student_id, trial_class_id, status, request_key, request_fingerprint, confirmed_at)
        VALUES
          ('40000000-0000-4000-8000-000000000001', ${s3}, ${seedIds.ordinaryClass}, 'confirmed', 'seed-ordinary-confirmed', 'seed', now()),
          ('40000000-0000-4000-8000-000000000002', ${s2}, ${seedIds.ordinaryClass}, 'payment_failed', 'seed-payment-failed', 'seed', NULL),
          ('40000000-0000-4000-8000-000000000003', ${s6}, ${seedIds.ordinaryClass}, 'pending_payment', 'seed-duplicate-pending', 'seed', NULL),
          ('40000000-0000-4000-8000-000000000004', ${s3}, ${seedIds.lastSeatClass}, 'confirmed', 'seed-last-seat-1', 'seed', now()),
          ('40000000-0000-4000-8000-000000000005', ${s4}, ${seedIds.lastSeatClass}, 'confirmed', 'seed-last-seat-2', 'seed', now()),
          ('40000000-0000-4000-8000-000000000006', ${s5}, ${seedIds.lastSeatClass}, 'confirmed', 'seed-last-seat-3', 'seed', now()),
          ('40000000-0000-4000-8000-000000000007', ${s3}, ${seedIds.fullClass}, 'confirmed', 'seed-full-1', 'seed', now()),
          ('40000000-0000-4000-8000-000000000008', ${s4}, ${seedIds.fullClass}, 'confirmed', 'seed-full-2', 'seed', now()),
          ('40000000-0000-4000-8000-000000000009', ${s5}, ${seedIds.fullClass}, 'confirmed', 'seed-full-3', 'seed', now()),
          ('40000000-0000-4000-8000-000000000010', ${s6}, ${seedIds.fullClass}, 'confirmed', 'seed-full-4', 'seed', now())
      `;
      await tx`
        INSERT INTO payment_attempts
          (booking_id, idempotency_key, request_fingerprint, result, amount_minor, booking_status)
        VALUES
          ('40000000-0000-4000-8000-000000000002', 'seed-failed-attempt', 'seed', 'failed', 2500, 'payment_failed')
      `;
    });
  } finally {
    await sql.end();
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
await seedDatabase(databaseUrl);
console.info("Database seed complete");
