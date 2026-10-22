import test from "node:test";
import assert from "node:assert/strict";
import { ApiFootballProvider } from "../lib/adapters/football";
import { OpenAIImageProvider } from "../lib/adapters/images";
import { mockFixtures } from "../lib/mock";
import { defaultSettings } from "../lib/defaults";
const originalFetch = globalThis.fetch;
test("football adapter normalizes canonical provider fixture and handles quota errors", async () => {
  const originalKey = process.env.FOOTBALL_API_KEY;
  process.env.FOOTBALL_API_KEY = "test-placeholder";
  try {
    let received = "";
    globalThis.fetch = async (input) => {
      received = String(input);
      return Response.json({
        errors: [],
        response: [
          {
            fixture: {
              id: 77,
              date: "2026-10-21T19:00:00Z",
              venue: { name: "Example stadium" },
              status: { short: "NS" },
            },
            league: { name: "Example league", country: "ES" },
            teams: {
              home: {
                id: 1,
                name: "Local",
                logo: "https://example.test/a.png",
              },
              away: {
                id: 2,
                name: "Visitante",
                logo: "https://example.test/b.png",
              },
            },
          },
        ],
      });
    };
    const items = await new ApiFootballProvider().fixtures("2026-10-21");
    assert.equal(items[0].id, 77);
    assert.equal(items[0].home.name, "Local");
    assert.ok(received.includes("timezone=Europe%2FMadrid"));
    globalThis.fetch = async () =>
      Response.json({ errors: { requests: "quota" }, response: [] });
    await assert.rejects(
      () => new ApiFootballProvider().fixtures("2026-10-21"),
      /rechazó/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FOOTBALL_API_KEY;
    else process.env.FOOTBALL_API_KEY = originalKey;
  }
});
test("OpenAI adapter sends exact format and decodes bytes without exposing errors", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-placeholder";
  try {
    let body: Record<string, unknown> = {};
    globalThis.fetch = async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ data: [{ b64_json: "AQID" }] });
    };
    const result = await new OpenAIImageProvider().generate(
      mockFixtures("2026-10-21")[0],
      defaultSettings,
      "Test prompt",
    );
    assert.equal(body.size, "864x1536");
    assert.equal(body.n, 1);
    assert.deepEqual([...result.bytes], [1, 2, 3]);
    assert.equal(result.demo, false);
    globalThis.fetch = async () =>
      new Response("private provider message", { status: 429 });
    await assert.rejects(
      () =>
        new OpenAIImageProvider().generate(
          mockFixtures("2026-10-21")[0],
          defaultSettings,
          "Test prompt",
        ),
      /límite/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
