import { madridDate } from "../lib/date";
import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const enabled = process.env.TEST_HTTP === "true";
test(
  "HTTP: demo fixture contract, no secrets and validation",
  { skip: !enabled },
  async () => {
    const c = await fetch(base + "/api/config");
    assert.equal(c.status, 200);
    const config = (await c.json()) as Record<string, unknown>;
    assert.equal(config.demo, true);
    assert.deepEqual(Object.keys(config).sort(), [
      "configured",
      "demo",
      "footballMock",
      "footballProvider",
      "generationConfigured",
      "imageMock",
    ]);
    const res = await fetch(base + "/api/fixtures?date=2026-10-21");
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      fixtures: { kickoff: string }[];
      mock: boolean;
      source: { name: string; timezone: string };
    };
    assert.equal(body.mock, false);
    assert.equal(body.source.name, "ESPN");
    assert.equal(body.source.timezone, "Europe/Madrid");
    assert.ok(
      body.fixtures.every(
        (f) => madridDate(new Date(f.kickoff)) === "2026-10-21",
      ),
    );
    const invalid = await fetch(base + "/api/fixtures?date=2026-02-30");
    assert.equal(invalid.status, 400);
    assert.ok(res.headers.get("cache-control")?.includes("no-store"));
  },
);
test(
  "HTTP: cross-origin writes rejected, demo does not call real generation",
  { skip: !enabled },
  async () => {
    const cross = await fetch(base + "/api/generate", {
      method: "POST",
      headers: {
        Origin: "https://invalid.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(cross.status, 403);
    const demo = await fetch(base + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(demo.status, 400);
    const gallery = await fetch(base + "/api/gallery");
    assert.equal(gallery.status, 200);
    assert.deepEqual(await gallery.json(), { images: [], hasMore: false });
  },
);
test(
  "HTTP: page contains studio and custom not-found responds 404",
  { skip: !enabled },
  async () => {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.ok((await home.text()).includes("Grandes partidos"));
    const missing = await fetch(base + "/missing-test-page");
    assert.equal(missing.status, 404);
  },
);
