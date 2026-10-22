import "server-only";
import postgres from "postgres";
import { AppError } from "./errors";
import { databaseTls } from "./database-tls.mjs";

export interface Database {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<T[]>;
  transaction<T>(work: (db: Database) => Promise<T>): Promise<T>;
}
let connection: ReturnType<typeof postgres> | undefined;
function adapter(sql: ReturnType<typeof postgres>): Database {
  return {
    query: async <T extends object>(text: string, values: unknown[] = []) =>
      (await sql.unsafe(text, values as never[])) as unknown as T[],
    transaction: async <T>(work: (db: Database) => Promise<T>) =>
      (await sql.begin((tx) =>
        work(adapter(tx as unknown as ReturnType<typeof postgres>)),
      )) as T,
  };
}
export function database(): Database {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl)
    throw new AppError(
      "La base de datos de las cuentas está pendiente de conectar.",
      503,
    );
  connection ??= postgres(databaseUrl, {
    ssl: databaseTls(databaseUrl),
    max: 3,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return adapter(connection);
}
