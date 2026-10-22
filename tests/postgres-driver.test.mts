import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { databaseTls } from "../lib/database-tls.mjs";
import { galleryRecord, galleryRecords } from "../lib/gallery-records";
import { listOwnImages } from "../lib/own-gallery";
import type { Database } from "../lib/database";
import { mockFixtures } from "../lib/mock";
import { defaultSettings } from "../lib/defaults";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
test(
  "existing saved images pass through the gallery mapper without exposing or changing their contents",
  { skip: !url },
  async () => {
    const sql = postgres(url!, {
      ssl: databaseTls(url!),
      max: 1,
      prepare: false,
      connect_timeout: 10,
    });
    try {
      const owners = await sql.unsafe(
        "SELECT DISTINCT user_id FROM matchday_images LIMIT 100",
      );
      const adapter = {
        query: async (text: string, values: unknown[] = []) =>
          sql.unsafe(text, values as never[]),
      } as Database;
      let count = 0;
      for (const owner of owners) {
        const page = await listOwnImages(owner.user_id, 0, adapter);
        const records = galleryRecords(page.images);
        assert.equal(
          records.unreadable,
          0,
          "Saved metadata could not be decoded",
        );
        count += records.images.length;
      }
      console.log("Verified readable saved images:", count);
    } finally {
      await sql.end();
    }
  },
);
test(
  "real Postgres.js JSONB round trip and recovery of legacy gallery metadata",
  { skip: !url },
  async () => {
    const sql = postgres(url!, {
      ssl: databaseTls(url!),
      max: 1,
      prepare: false,
      connect_timeout: 10,
    });
    try {
      await sql.begin(async (tx) => {
        // This table exists only inside this transaction. No user data is read or changed.
        await tx.unsafe(
          "CREATE TEMP TABLE matchday_gallery_json_check (fixture jsonb, settings jsonb) ON COMMIT DROP",
        );
        const fixture = mockFixtures("2026-10-22")[0];
        const [row] = await tx.unsafe(
          "INSERT INTO matchday_gallery_json_check VALUES ($1::jsonb,$2::jsonb) RETURNING fixture,settings,jsonb_typeof(fixture) AS kind",
          [fixture as never, defaultSettings as never],
        );
        assert.equal(row.kind, "object");
        assert.deepEqual(row.fixture, fixture);
        assert.deepEqual(row.settings, defaultSettings);
        const [legacy] = await tx.unsafe(
          "INSERT INTO matchday_gallery_json_check VALUES ($1::jsonb,$2::jsonb) RETURNING fixture,settings,jsonb_typeof(fixture) AS kind",
          [JSON.stringify(fixture), JSON.stringify(defaultSettings)],
        );
        assert.equal(legacy.kind, "string");
        const recovered = galleryRecord({
          ...legacy,
          id: "stored-image",
          url: "/api/gallery/stored-image/file",
          prompt: "Preserved original prompt",
          created_at: "2026-10-22T12:00:00Z",
          demo: false,
        });
        assert.deepEqual(recovered?.fixture, fixture);
        assert.deepEqual(recovered?.settings, defaultSettings);
        assert.equal(recovered?.url, "/api/gallery/stored-image/file");
      });
    } finally {
      await sql.end();
    }
  },
);
