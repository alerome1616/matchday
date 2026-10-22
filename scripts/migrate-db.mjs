import { readFile } from "node:fs/promises";
import postgres from "postgres";

// Environment is injected by the platform/terminal. Never print connection strings.
if (!process.env.DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL. Configúrala en el entorno privado antes de aplicar la migración.",
  );
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, {
  ssl: ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
    ? false
    : "verify-full",
  max: 1,
  prepare: false,
  connect_timeout: 10,
});
try {
  await sql.unsafe(
    await readFile(
      new URL("../db/migrations/001_accounts.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log("Tablas de cuentas, sesiones, claves y galería preparadas.");
} catch {
  console.error(
    "No se pudo aplicar la migración. Comprueba la conexión y los permisos de la base de datos.",
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
