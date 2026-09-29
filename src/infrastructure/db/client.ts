import postgres from "postgres";

import { getEnvironment } from "@/lib/env";

export type SqlClient = ReturnType<typeof postgres>;

export function createSqlClient(databaseUrl: string, max = 10): SqlClient {
  return postgres(databaseUrl, {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
  });
}

let applicationClient: SqlClient | undefined;

export function getSqlClient(): SqlClient {
  applicationClient ??= createSqlClient(getEnvironment().DATABASE_URL);
  return applicationClient;
}
