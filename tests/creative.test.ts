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

// Free designs use the same validated file and OpenAI pipeline without fetching fixtures.
import { generationSchema } from "../lib/validation";
import { freeGenerationForm } from "../lib/generation-design";
import { resolveGenerationSubject } from "../lib/generation-subject";
import { buildFreePrompt } from "../lib/prompt";
const freeSettings = {
  ...defaultSettings,
  scene: "custom" as const,
  headline: "CIUDAD FLOTANTE",
  prompt:
    "Una ciudad flotante entre nubes con luz de atardecer y arquitectura detallada.",
};
test("free payload requires an explicit mode, title and prompt; legacy match payloads remain valid", async () => {
  const valid = {
    mode: "free",
    fixtureIds: [],
    settings: freeSettings,
    requestId: crypto.randomUUID(),
  };
  const parsed = generationSchema.parse(valid);
  let footballCalls = 0;
  const subject = await resolveGenerationSubject(parsed, async () => {
    footballCalls++;
    throw Error("Football unavailable");
  });
  assert.deepEqual(subject, { kind: "free" });
  assert.equal(footballCalls, 0);
  for (const invalid of [
    { ...valid, mode: undefined },
    { ...valid, settings: { ...freeSettings, headline: "  " } },
    { ...valid, settings: { ...freeSettings, prompt: "short" } },
    { ...valid, fixtureIds: [123] },
  ])
    assert.equal(generationSchema.safeParse(invalid).success, false);
  assert.equal(generationSchema.parse(input()).mode, "match");
  const prompt = buildFreePrompt(freeSettings, [
    { role: "home-kit", notes: "Usa esta nave como objeto principal" },
  ]);
  assert.ok(prompt.includes(freeSettings.prompt));
  assert.ok(prompt.includes(freeSettings.headline));
  assert.ok(prompt.includes("Usa esta nave"));
  assert.ok(
    !/encuentro|equipo|estadio|Europe\/Madrid|EQUIPO_LOCAL/i.test(prompt),
  );
});
test("free generation sends title, prompt and exact optional reference bytes to OpenAI; no football or database requests", async () => {
  const originalFetch = globalThis.fetch;
  const previousProvider = process.env.FOOTBALL_PROVIDER;
  process.env.FOOTBALL_PROVIDER = "espn";
  try {
    for (const withReference of [false, true]) {
      let calls = 0;
      globalThis.fetch = async (url, init) => {
        calls++;
        assert.equal(
          String(url),
          "https://api.openai.com/v1/images/" +
            (withReference ? "edits" : "generations"),
        );
        if (withReference) {
          assert.ok(init?.body instanceof FormData);
          const file = init.body.getAll("image[]")[0] as File;
          assert.deepEqual(Buffer.from(await file.arrayBuffer()), pngBytes);
          assert.ok(
            String(init.body.get("prompt")).includes(freeSettings.headline),
          );
        } else {
          const payload = JSON.parse(String(init?.body));
          assert.ok(payload.prompt.includes(freeSettings.prompt));
          assert.ok(payload.prompt.includes(freeSettings.headline));
        }
        return Response.json({
          data: [{ b64_json: pngBytes.toString("base64") }],
        });
      };
      const form = freeGenerationForm(
        freeSettings,
        withReference
          ? [
              {
                id: "ref",
                file: png(),
                preview: "blob:test",
                role: "composition",
                notes: "Mantén el encuadre",
              },
            ]
          : [],
        crypto.randomUUID(),
        "test-key-not-a-real-secret",
      );
      const response = await sessionGeneration(
        new Request("https://example.test/api/generate-session", {
          method: "POST",
          body: form,
          headers: { Origin: "https://example.test" },
        }),
      );
      assert.equal(response.status, 200);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pngBytes);
      assert.equal(calls, 1);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (previousProvider === undefined) delete process.env.FOOTBALL_PROVIDER;
    else process.env.FOOTBALL_PROVIDER = previousProvider;
  }
});
