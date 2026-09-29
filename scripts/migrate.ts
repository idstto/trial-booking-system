import "dotenv/config";

import { readFile } from "node:fs/promises";

import { createSqlClient } from "../src/infrastructure/db/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migration = await readFile(new URL("../drizzle/0000_initial.sql", import.meta.url), "utf8");
const sql = createSqlClient(databaseUrl, 1);

try {
  await sql.unsafe(migration);
  console.info("Database migration complete");
} finally {
  await sql.end();
}
