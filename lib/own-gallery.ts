import "server-only";
import { database, type Database } from "./database";
import type { DesignSubject, Settings, GalleryImage } from "./types";
import { AppError } from "./errors";
import { decodeStoredJson } from "./gallery-records";
export type OwnImage = {
  id: string;
  storage_path: string;
  fixture: DesignSubject;
  settings: Settings;
  prompt: string;
  created_at: Date;
};
export async function listOwnImages(
  owner: string,
  page: number,
  db: Pick<Database, "query"> = database(),
) {
  const rows = await db.query<OwnImage>(
    `SELECT id,storage_path,fixture,settings,prompt,created_at FROM matchday_images WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $2`,
    [owner, page * 24],
  );
  return {
    images: rows.slice(0, 24).map((row): GalleryImage => ({
      id: row.id,
      fixture: decodeStoredJson(row.fixture) as DesignSubject,
      settings: decodeStoredJson(row.settings) as Settings,
      prompt: row.prompt,
      created_at: row.created_at.toISOString(),
      url: `/api/gallery/${row.id}/file`,
      demo: false,
    })),
    hasMore: rows.length > 24,
  };
}
export async function ownImage(
  owner: string,
  id: string,
  db: Database = database(),
) {
  const [row] = await db.query<OwnImage>(
    "SELECT id,storage_path,fixture,settings,prompt,created_at FROM matchday_images WHERE user_id=$1 AND id=$2",
    [owner, id],
  );
  if (!row) throw new AppError("Imagen no encontrada.", 404);
  return row;
}
export async function reserveOwnGeneration(
  owner: string,
  request: string,
  db: Database = database(),
) {
  const rawLimit = Number(process.env.DAILY_GENERATION_LIMIT || 100);
  const limit = Number.isSafeInteger(rawLimit) && rawLimit > 0 ? rawLimit : 100;
  await db.transaction(async (db) => {
    // Row locking serializes quota checks for this user across all server instances.
    await db.query("SELECT id FROM matchday_users WHERE id=$1 FOR UPDATE", [
      owner,
    ]);
    const [{ count }] = await db.query<{ count: string }>(
      "SELECT count(*) FROM matchday_generation_requests WHERE user_id=$1 AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
      [owner],
    );
    if (Number(count) >= limit)
      throw new AppError(
        `Has alcanzado el límite diario de ${limit} diseños.`,
        429,
      );
    const active = await db.query(
      "SELECT id FROM matchday_generation_requests WHERE user_id=$1 AND status='pending' AND created_at>now()-interval '10 minutes'",
      [owner],
    );
    if (active.length)
      throw new AppError(
        "Ya hay una generación en curso. Espera a que termine.",
        429,
      );
    const duplicate = await db.query(
      "SELECT id FROM matchday_generation_requests WHERE id=$1",
      [request],
    );
    if (duplicate.length)
      throw new AppError(
        "Esta solicitud ya se procesó. Revisa tu galería.",
        409,
      );
    await db.query(
      "INSERT INTO matchday_generation_requests (id,user_id,status) VALUES ($1,$2,'pending')",
      [request, owner],
    );
  });
}
