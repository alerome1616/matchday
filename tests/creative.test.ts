import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "../lib/prompt";
import { defaultSettings, upgradeCreativeSettings } from "../lib/defaults";
import { mockFixtures } from "../lib/mock";
import { OpenAIImageProvider, MockImageProvider } from "../lib/adapters/images";
import {
  readGenerationRequest,
  validateReferenceFiles,
} from "../lib/generation-request";
import { POST as sessionGeneration } from "../app/api/generate-session/route";
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5VkAAAAASUVORK5CYII=",
  "base64",
);
const png = () => new File([pngBytes], "camiseta.png", { type: "image/png" });
const fixture = mockFixtures("2026-10-21")[0];
const input = () => ({
  fixtureIds: [fixture.id],
  date: "2026-10-21",
  settings: defaultSettings,
  requestId: crypto.randomUUID(),
  references: [{ role: "home-kit", notes: "Conservar cuello y escudo" }],
});
test("creative prompt maps references to their role and substitutes actual match teams", () => {
  const prompt = buildPrompt(
    fixture,
    { ...defaultSettings, headline: "{EQUIPO_LOCAL} EN JUEGO" },
    [
      { role: "home-kit", notes: "Conservar cuello" },
      { role: "style", notes: "Luz cálida" },
    ],
  );
  assert.ok(prompt.includes("Real Madrid EN JUEGO"));
  assert.ok(prompt.includes("Imagen de referencia 1"));
  assert.ok(prompt.includes("camiseta del equipo local"));
  assert.ok(prompt.includes("Conservar cuello"));
  assert.ok(prompt.includes("no copiar los equipos"));
  assert.ok(!/\{[A-Z_]+\}/.test(prompt));
  assert.ok(prompt.includes("fotorealista"));
});
test("custom prompts are retained when old settings gain creative fields", () => {
  const custom = {
    ...defaultSettings,
    prompt: "Mi escena personalizada con luz lateral.",
  };
  assert.equal(upgradeCreativeSettings(custom).prompt, custom.prompt);
});
test("reference validation rejects disguised SVG, excess files and oversized files", async () => {
  await validateReferenceFiles([png()]);
  await assert.rejects(
    () =>
      validateReferenceFiles([
        new File(["<svg/>"], "fake.png", { type: "image/png" }),
      ]),
    /válidas/,
  );
  await assert.rejects(
    () => validateReferenceFiles(Array.from({ length: 5 }, png)),
    /hasta 4/,
  );
  await assert.rejects(
    () =>
      validateReferenceFiles([
        new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", {
          type: "image/png",
        }),
      ]),
    /4 MB/,
  );
});
test("multipart request keeps exact binary files and matching reference instructions", async () => {
  const form = new FormData();
  form.set("payload", JSON.stringify(input()));
  form.append("references", png());
  form.set("apiKey", "test-key-not-a-real-secret");
  const parsed = await readGenerationRequest(
    new Request("https://example.test/api/generate-session", {
      method: "POST",
      body: form,
    }),
  );
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.input.references[0].role, "home-kit");
  assert.deepEqual(
    new Uint8Array(await parsed.files[0].arrayBuffer()),
    new Uint8Array(pngBytes),
  );
  const bad = new FormData();
  bad.set("payload", JSON.stringify(input()));
  await assert.rejects(
    () =>
      readGenerationRequest(
        new Request("https://example.test/api/generate-session", {
          method: "POST",
          body: bad,
        }),
      ),
    /función asignada/,
  );
});
test("OpenAI receives real image files through edits endpoint and never a fabricated poster", async () => {
  const original = globalThis.fetch;
  try {
    let captured: RequestInit | undefined;
    let endpoint = "";
    globalThis.fetch = async (url, init) => {
      endpoint = String(url);
      captured = init;
      return Response.json({
        data: [{ b64_json: pngBytes.toString("base64") }],
      });
    };
    const result = await new OpenAIImageProvider(
      "test-key-not-a-real-secret",
    ).generate(fixture, defaultSettings, "Scene prompt", [png()]);
    assert.ok(endpoint.endsWith("/images/edits"));
    assert.ok(captured?.body instanceof FormData);
    const multipart = captured!.body as FormData;
    assert.equal(multipart.getAll("image[]").length, 1);
    assert.equal(multipart.get("prompt"), "Scene prompt");
    assert.equal(
      (captured!.headers as Record<string, string>)["Content-Type"],
      undefined,
    );
    assert.equal(result.demo, false);
    await assert.rejects(
      () => new MockImageProvider().generate(),
      /desactivada/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("session route requires caller key and sends multipart references to OpenAI without Supabase", async () => {
  const originalFetch = globalThis.fetch;
  const oldProvider = process.env.FOOTBALL_PROVIDER;
  process.env.FOOTBALL_PROVIDER = "mock";
  try {
    const missing = new FormData();
    missing.set("payload", JSON.stringify({ ...input(), references: [] }));
    const denied = await sessionGeneration(
      new Request("https://example.test/api/generate-session", {
        method: "POST",
        body: missing,
      }),
    );
    assert.equal(denied.status, 401);
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json({
        data: [{ b64_json: pngBytes.toString("base64") }],
      });
    };
    const form = new FormData();
    form.set("payload", JSON.stringify(input()));
    form.set("apiKey", "test-key-not-a-real-secret");
    form.append("references", png());
    const response = await sessionGeneration(
      new Request("https://example.test/api/generate-session", {
        method: "POST",
        body: form,
        headers: { Origin: "https://example.test" },
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(
      new Uint8Array(await response.arrayBuffer()),
      new Uint8Array(pngBytes),
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldProvider === undefined) delete process.env.FOOTBALL_PROVIDER;
    else process.env.FOOTBALL_PROVIDER = oldProvider;
  }
});
