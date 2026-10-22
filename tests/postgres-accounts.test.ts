import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Database } from "../lib/database";
import { createAccounts } from "../lib/accounts";
import { createOwnKeys } from "../lib/own-credentials";
import { tokenHash } from "../lib/passwords";
import {
  reserveOwnGeneration,
  listOwnImages,
  ownImage,
} from "../lib/own-gallery";
import { mockFixtures } from "../lib/mock";
import { defaultSettings } from "../lib/defaults";
test("PostgreSQL migration, registration, durable sessions, owner-isolated encrypted keys and revocation", async () => {
  const pg = new PGlite();
  const previous = process.env.API_KEY_ENCRYPTION_SECRET;
  process.env.API_KEY_ENCRYPTION_SECRET = "ab".repeat(32);
  const db: Database = {
    query: async <T extends object>(text: string, values: unknown[] = []) =>
      (await pg.query<T>(text, values)).rows,
    transaction: async (work) =>
      pg.transaction(async (tx) =>
        work({
          ...db,
          query: async <T extends object>(
            text: string,
            values: unknown[] = [],
          ) => (await tx.query<T>(text, values)).rows,
        }),
      ),
  };
  try {
    const migration = await readFile(
      new URL("../db/migrations/001_accounts.sql", import.meta.url),
      "utf8",
    );
    await pg.exec(migration);
    await pg.exec(migration); // repeat application is safe
    const accounts = createAccounts(db);
    const a = await accounts.register(
      { email: " A@EXAMPLE.COM ", password: "a-long-password" },
      "one",
    );
    assert.equal(a.user.email, "a@example.com");
    assert.deepEqual(await accounts.current(a.token), a.user);
    const [stored] = await db.query<{
      token_hash: string;
      password_hash: string;
    }>(
      "SELECT s.token_hash,u.password_hash FROM matchday_sessions s JOIN matchday_users u ON u.id=s.user_id",
    );
    assert.equal(stored.token_hash, tokenHash(a.token));
    assert.ok(!stored.password_hash.includes("a-long-password"));
    assert.equal(await accounts.current("invalid"), null);
    await assert.rejects(
      () =>
        accounts.login(
          { email: "a@example.com", password: "incorrect-password" },
          "one",
        ),
      /no son correctos/,
    );
    const b = await accounts.register(
      { email: "b@example.com", password: "another-password" },
      "two",
    );
    const keys = createOwnKeys(db);
    const request = crypto.randomUUID();
    await reserveOwnGeneration(a.user.id, request, db);
    await assert.rejects(
      () => reserveOwnGeneration(a.user.id, crypto.randomUUID(), db),
      /generación en curso/,
    );
    await reserveOwnGeneration(b.user.id, crypto.randomUUID(), db);
    const image = crypto.randomUUID();
    await db.query(
      `INSERT INTO matchday_images (id,user_id,request_id,storage_path,fixture,settings,prompt) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
      [
        image,
        a.user.id,
        request,
        "https://private.example/image.png",
        JSON.stringify(mockFixtures("2026-10-22")[0]),
        JSON.stringify(defaultSettings),
        "Example prompt",
      ],
    );
    await db.query(
      "UPDATE matchday_generation_requests SET status='succeeded' WHERE id=$1",
      [request],
    );
    assert.equal((await listOwnImages(a.user.id, 0, db)).images.length, 1);
    assert.equal((await listOwnImages(b.user.id, 0, db)).images.length, 0);
    await assert.rejects(() => ownImage(b.user.id, image, db), /no encontrada/);
    await assert.rejects(
      () => reserveOwnGeneration(a.user.id, request, db),
      /ya se procesó/,
    );
    const oldLimit = process.env.DAILY_GENERATION_LIMIT;
    process.env.DAILY_GENERATION_LIMIT = "1";
    try {
      await assert.rejects(
        () => reserveOwnGeneration(a.user.id, crypto.randomUUID(), db),
        /límite diario/,
      );
    } finally {
      if (oldLimit === undefined) delete process.env.DAILY_GENERATION_LIMIT;
      else process.env.DAILY_GENERATION_LIMIT = oldLimit;
    }
    const sample = "sk-test-placeholder-only-not-a-real-secret-1234";
    await keys.save(a.user.id, sample);
    assert.equal((await keys.status(a.user.id)).saved, true);
    assert.equal((await keys.status(b.user.id)).saved, false);
    assert.equal(await keys.read(b.user.id), undefined);
    assert.ok(!JSON.stringify(await keys.status(a.user.id)).includes(sample));
    await accounts.logout(a.token);
    assert.equal(await accounts.current(a.token), null);
    const next = await accounts.login(
      { email: "a@example.com", password: "a-long-password" },
      "one",
    );
    assert.notEqual(next.token, a.token);
    assert.equal(await keys.read(next.user.id), sample);
    await keys.remove(b.user.id);
    assert.equal(await keys.read(a.user.id), sample);
    await keys.save(a.user.id, "sk-test-new-placeholder-not-a-real-key-5678");
    assert.equal((await keys.status(a.user.id)).suffix, "5678");
    await db.query(
      "UPDATE matchday_sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
      [a.user.id],
    );
    assert.equal(await accounts.current(next.token), null);
    await keys.remove(a.user.id);
    assert.equal(await keys.read(a.user.id), undefined);
    for (let i = 0; i < 9; i++)
      await assert.rejects(() =>
        accounts.login(
          { email: "a@example.com", password: "incorrect-password" },
          "one",
        ),
      );
    await assert.rejects(
      () =>
        accounts.login(
          { email: "a@example.com", password: "a-long-password" },
          "one",
        ),
      /Demasiados intentos/,
    );
  } finally {
    await pg.close();
    if (previous === undefined) delete process.env.API_KEY_ENCRYPTION_SECRET;
    else process.env.API_KEY_ENCRYPTION_SECRET = previous;
  }
});
