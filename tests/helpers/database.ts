import { readFile } from "node:fs/promises";

import { createSqlClient, type SqlClient } from "@/infrastructure/db/client";

const defaultTestUrl = "postgresql://postgres:postgres@localhost:5432/trial_booking_test";

export function createTestClient(max = 10): SqlClient {
  return createSqlClient(process.env.TEST_DATABASE_URL ?? defaultTestUrl, max);
}

export async function migrateTestDatabase(sql: SqlClient): Promise<void> {
  const migration = await readFile(
    new URL("../../drizzle/0000_initial.sql", import.meta.url),
    "utf8",
  );
  await sql.unsafe(migration);
}

export async function resetTestDatabase(sql: SqlClient): Promise<void> {
  await sql`TRUNCATE payment_attempts, bookings, students, trial_classes, parents CASCADE`;
}
