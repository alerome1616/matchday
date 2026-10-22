import "server-only";
import type { Database } from "./database";
import type { ApiKeyStatus } from "./types";
import { encryptApiKey, decryptApiKey } from "./key-cipher";

export function createOwnKeys(db: Database) {
  return {
    async status(owner: string): Promise<ApiKeyStatus> {
      const [row] = await db.query<{ key_suffix: string; updated_at: Date }>(
        "SELECT key_suffix,updated_at FROM matchday_credentials WHERE user_id=$1",
        [owner],
      );
      return {
        available: true,
        saved: Boolean(row),
        suffix: row?.key_suffix,
        updatedAt: row?.updated_at.toISOString(),
      };
    },
    async save(owner: string, value: string): Promise<ApiKeyStatus> {
      const encrypted = await encryptApiKey(value, owner);
      const updatedAt = new Date().toISOString();
      const suffix = value.slice(-4);
      await db.query(
        `INSERT INTO matchday_credentials (user_id,encrypted_key,key_suffix,updated_at) VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id) DO UPDATE SET encrypted_key=excluded.encrypted_key,key_suffix=excluded.key_suffix,updated_at=excluded.updated_at`,
        [owner, encrypted, suffix, updatedAt],
      );
      return { available: true, saved: true, suffix, updatedAt };
    },
    async remove(owner: string): Promise<ApiKeyStatus> {
      await db.query("DELETE FROM matchday_credentials WHERE user_id=$1", [
        owner,
      ]);
      return { available: true, saved: false };
    },
    async read(owner: string) {
      const [row] = await db.query<{ encrypted_key: string }>(
        "SELECT encrypted_key FROM matchday_credentials WHERE user_id=$1",
        [owner],
      );
      return row ? decryptApiKey(row.encrypted_key, owner) : undefined;
    },
  };
}
