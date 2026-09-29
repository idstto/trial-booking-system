import type { SqlClient } from "@/infrastructure/db/client";

export class TransactionManager {
  constructor(private readonly sql: SqlClient) {}

  async run<T>(work: (transaction: SqlClient) => Promise<T>): Promise<T> {
    return (await this.sql.begin(async (transaction) =>
      work(transaction as unknown as SqlClient),
    )) as T;
  }
}
