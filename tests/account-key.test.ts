import test from "node:test";
import assert from "node:assert/strict";
import { encryptApiKey, decryptApiKey } from "../lib/key-cipher";
import { createAccountKeyHandlers } from "../lib/account-key-handlers";
import { AppError } from "../lib/errors";
import {
  saveUserApiKey,
  readUserApiKey,
  getApiKeyStatus,
  deleteUserApiKey,
  keyStorageConfigured,
} from "../lib/user-api-key";
import type { ApiKeyStatus } from "../lib/types";

const exampleKey = "sk-test-example-credential-never-a-real-key-1234";
const master = "12".repeat(32);

test("Vercel POSTGRES_URL enables saved-key status without DATABASE_URL", () => {
  const keys = [
    "AUTH_PROVIDER",
    "DATABASE_URL",
    "POSTGRES_URL",
    "API_KEY_ENCRYPTION_SECRET",
  ] as const;
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  try {
    delete process.env.AUTH_PROVIDER;
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_URL =
      "postgres://test:example@database.invalid/postgres";
    process.env.API_KEY_ENCRYPTION_SECRET = master;
    assert.equal(keyStorageConfigured(), true);
    delete process.env.API_KEY_ENCRYPTION_SECRET;
    assert.equal(keyStorageConfigured(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("credentials use randomized authenticated encryption bound to their owner", async () => {
  const previous = process.env.API_KEY_ENCRYPTION_SECRET;
  process.env.API_KEY_ENCRYPTION_SECRET = master;
  try {
    const first = await encryptApiKey(exampleKey, "user-a");
    const second = await encryptApiKey(exampleKey, "user-a");
    assert.notEqual(first, second);
    assert.ok(!first.includes(exampleKey));
    assert.equal(await decryptApiKey(first, "user-a"), exampleKey);
    await assert.rejects(
      () => decryptApiKey(first, "user-b"),
      /No se pudo abrir/,
    );
    const tampered = JSON.parse(first);
    const corrupted = Buffer.from(tampered.data, "base64");
    corrupted[0] ^= 1;
    tampered.data = corrupted.toString("base64");
    await assert.rejects(
      () => decryptApiKey(JSON.stringify(tampered), "user-a"),
      /No se pudo abrir/,
    );
    process.env.API_KEY_ENCRYPTION_SECRET = "34".repeat(32);
    await assert.rejects(
      () => decryptApiKey(first, "user-a"),
      /No se pudo abrir/,
    );
    process.env.API_KEY_ENCRYPTION_SECRET = "invalid";
    await assert.rejects(
      () => encryptApiKey(exampleKey, "user-a"),
      /pendiente de configurar/,
    );
  } finally {
    if (previous === undefined) delete process.env.API_KEY_ENCRYPTION_SECRET;
    else process.env.API_KEY_ENCRYPTION_SECRET = previous;
  }
});

test("account routes persist per verified user across sessions without returning keys", async () => {
  let currentUser: string | null = "user-a";
  const accounts = new Map<string, string>();
  const status = async (owner: string): Promise<ApiKeyStatus> => ({
    available: true,
    saved: accounts.has(owner),
    suffix: accounts.get(owner)?.slice(-4),
  });
  const handlers = createAccountKeyHandlers({
    authenticate: async () => {
      if (!currentUser)
        throw new AppError("Inicia sesión para continuar.", 401);
      return currentUser;
    },
    status,
    save: async (owner, key) => {
      accounts.set(owner, key);
      return status(owner);
    },
    remove: async (owner) => {
      accounts.delete(owner);
      return status(owner);
    },
  });
  const request = (
    method: string,
    data?: unknown,
    origin = "https://studio.example",
  ) =>
    new Request("https://studio.example/api/account/openai-key", {
      method,
      headers: { origin, "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  const saved = await handlers.PUT(request("PUT", { apiKey: exampleKey }));
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("cache-control"), "private, no-store");
  assert.ok(!(await saved.text()).includes(exampleKey));
  currentUser = null;
  assert.equal((await handlers.GET()).status, 401);
  assert.equal(
    (await handlers.PUT(request("PUT", { apiKey: exampleKey }))).status,
    401,
  );
  assert.equal((await handlers.DELETE(request("DELETE"))).status, 401);
  currentUser = "user-b";
  assert.equal(
    ((await (await handlers.GET()).json()) as ApiKeyStatus).saved,
    false,
  );
  await handlers.DELETE(request("DELETE"));
  assert.equal(accounts.has("user-a"), true);
  const injected = await handlers.PUT(
    request("PUT", { apiKey: exampleKey, user_id: "user-a" }),
  );
  assert.equal(injected.status, 400);
  assert.equal(accounts.has("user-b"), false);
  currentUser = "user-a";
  const restored = (await (await handlers.GET()).json()) as ApiKeyStatus;
  assert.equal(restored.saved, true);
  assert.equal(restored.suffix, "1234");
  const blocked = await handlers.DELETE(
    request("DELETE", undefined, "https://attacker.example"),
  );
  assert.equal(blocked.status, 403);
  assert.equal(accounts.has("user-a"), true);
  const removed = await handlers.DELETE(request("DELETE"));
  assert.equal(((await removed.json()) as ApiKeyStatus).saved, false);
});

test("Supabase adapter writes only ciphertext, scopes reads and deletes, and returns metadata only", async () => {
  const names = [
    "API_KEY_ENCRYPTION_SECRET",
    "SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
  ];
  const previous = names.map((name) => process.env[name]);
  const originalFetch = globalThis.fetch;
  process.env.API_KEY_ENCRYPTION_SECRET = master;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_example_not_real";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
  const rows = new Map<string, Record<string, string>>();
  try {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://supabase.example");
      assert.ok(url.pathname.endsWith("/user_api_credentials"));
      if (init?.method === "POST") {
        const row = JSON.parse(String(init.body));
        assert.ok(!row.encrypted_key.includes(exampleKey));
        assert.deepEqual(Object.keys(row).sort(), [
          "encrypted_key",
          "key_suffix",
          "updated_at",
          "user_id",
        ]);
        rows.set(row.user_id, row);
        return Response.json(null);
      }
      const owner = url.searchParams.get("user_id")?.replace(/^eq\./, "");
      assert.ok(owner);
      if (init?.method === "DELETE") {
        rows.delete(owner);
        return Response.json(null);
      }
      const row = rows.get(owner);
      const fields = url.searchParams.get("select")!.split(",");
      return Response.json(
        row ? Object.fromEntries(fields.map((key) => [key, row[key]])) : null,
      );
    };
    await saveUserApiKey("user-a", exampleKey);
    assert.equal(await readUserApiKey("user-a"), exampleKey);
    assert.equal(await readUserApiKey("user-b"), undefined);
    const status = await getApiKeyStatus("user-a");
    assert.equal(status.saved, true);
    assert.ok(!JSON.stringify(status).includes("encrypted_key"));
    await deleteUserApiKey("user-b");
    assert.equal(await readUserApiKey("user-a"), exampleKey);
    await deleteUserApiKey("user-a");
    assert.equal((await getApiKeyStatus("user-a")).saved, false);
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, i) => {
      if (previous[i] === undefined) delete process.env[name];
      else process.env[name] = previous[i];
    });
  }
});
