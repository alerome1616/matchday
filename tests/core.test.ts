import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "../lib/prompt";
import { defaultSettings, formats } from "../lib/defaults";
import { mockFixtures } from "../lib/mock";
import { demoPoster } from "../lib/poster";
import {
  generationSchema,
  dateSchema,
  settingsSchema,
} from "../lib/validation";
import { madridDate } from "../lib/date";
import { AppError, protectMutation } from "../lib/errors";
const f = mockFixtures("2026-10-21")[0];
test("mutation guard uses the configured HTTPS origin only for the matching host", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://studio.example";
  try {
    const request = (origin: string, host: string) =>
      new Request("http://localhost:3000/api/generate", {
        headers: { origin, host },
      });
    assert.doesNotThrow(() =>
      protectMutation(request("https://studio.example", "studio.example")),
    );
    assert.throws(
      () =>
        protectMutation(request("https://attacker.example", "studio.example")),
      AppError,
    );
    assert.throws(
      () =>
        protectMutation(request("https://studio.example", "127.0.0.1:3000")),
      AppError,
    );
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});
test("mutation guard accepts the actual local host when Next normalizes its URL", () => {
  for (const host of ["127.0.0.1:3000", "localhost:3000", "[::1]:3000"]) {
    const req = new Request("http://localhost:3000/api/generate-session", {
      method: "POST",
      headers: { host, origin: `http://${host}` },
    });
    assert.doesNotThrow(() => protectMutation(req));
  }
});
test("mutation guard rejects external origins, other ports and other protocols", () => {
  for (const origin of [
    "https://invalid.example",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "https://127.0.0.1:3000",
    "http://localhost.attacker.example:3000",
    "null",
    "not-a-url",
  ]) {
    const req = new Request("http://localhost:3000/api/generate-session", {
      method: "POST",
      headers: { host: "127.0.0.1:3000", origin },
    });
    assert.throws(
      () => protectMutation(req),
      (error: unknown) => error instanceof AppError && error.status === 403,
    );
  }
});
test("mutation guard does not trust external Host or forwarded headers", () => {
  for (const host of [
    "invalid.example",
    "127.0.0.1:3001",
    "localhost@invalid.example",
  ]) {
    const req = new Request("http://localhost:3000/api/generate-session", {
      method: "POST",
      headers: {
        host,
        origin: `http://${host}`,
        "x-forwarded-host": host,
        "x-forwarded-proto": "http",
      },
    });
    assert.throws(() => protectMutation(req), AppError);
  }
});
test("mutation guard retains normal same-origin checks for hosted requests", () => {
  const url = "https://studio.example/api/generate";
  assert.doesNotThrow(() =>
    protectMutation(
      new Request(url, {
        headers: { origin: "https://studio.example" },
      }),
    ),
  );
  assert.throws(
    () =>
      protectMutation(
        new Request(url, {
          headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
        }),
      ),
    AppError,
  );
});
test("prompt resolves all supported tokens with Madrid kickoff", () => {
  const result = buildPrompt(f, defaultSettings);
  assert.ok(result.includes("Real Madrid"));
  assert.ok(result.includes("Juventus"));
  assert.ok(result.includes("18:45"));
  assert.ok(result.includes("Santiago Bernabéu"));
  assert.ok(!/\{[A-Z_]+\}/.test(result));
});
test("schema rejects invalid dates, duplicate fixtures, bad enums and oversized prompts", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2026-10-21").success, true);
  assert.equal(
    generationSchema.safeParse({
      fixtureIds: [1, 1],
      date: "2026-10-21",
      settings: defaultSettings,
      requestId: crypto.randomUUID(),
    }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({ ...defaultSettings, style: "unknown" }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({ ...defaultSettings, prompt: "x".repeat(4001) })
      .success,
    false,
  );
});
test("demo SVG escapes provider team names and renders all ratios", () => {
  for (const format of Object.keys(formats) as (keyof typeof formats)[]) {
    const svg = demoPoster(
      { ...f, home: { ...f.home, name: "<script>alert(1)</script>" } },
      { ...defaultSettings, format },
    );
    assert.ok(!svg.includes("<script>"));
    assert.ok(svg.includes("&lt;script&gt;"));
    assert.ok(svg.startsWith("<svg"));
  }
});
test("dates use Madrid timezone, including UTC midnight rollover", () => {
  assert.equal(madridDate(new Date("2026-10-20T23:30:00Z")), "2026-10-21");
});
test("image formats are exact supported multiples of 16", () => {
  for (const f of Object.values(formats)) {
    const [w, h] = f.size.split("x").map(Number);
    assert.equal(w % 16, 0);
    assert.equal(h % 16, 0);
    assert.ok(w * h >= 655360);
    const [rw, rh] = f.ratio.split(":").map(Number);
    assert.equal(w / h, rw / rh);
  }
});
