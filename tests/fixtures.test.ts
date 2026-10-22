import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEspnBoards,
  EspnFootballProvider,
} from "../lib/adapters/espn";
import { resolveFootballSource } from "../lib/football-config";
import { getConfig } from "../lib/config";
import { madridDate } from "../lib/date";
const event = (id: string, date: string) => ({
  id,
  date,
  competitions: [
    {
      date,
      altGameNote: "UEFA Champions League, League Phase",
      venue: { fullName: "Test stadium", address: { country: "Spain" } },
      competitors: [
        {
          homeAway: "away",
          team: {
            id: "2",
            displayName: "Visitante",
            abbreviation: "VIS",
            color: "ffffff",
          },
          score: "1",
        },
        {
          homeAway: "home",
          team: {
            id: "1",
            displayName: "Local",
            abbreviation: "LOC",
            color: "003322",
          },
          score: "2",
        },
      ],
      status: { type: { state: "in" } },
    },
  ],
});
test("Madrid day includes previous UTC evening, excludes next local midnight and deduplicates", () => {
  const a = event("101", "2026-10-20T22:30:00Z");
  const b = event("102", "2026-10-21T21:59:00Z");
  const wrong = event("103", "2026-10-21T22:00:00Z");
  const fixtures = normalizeEspnBoards(
    [{ events: [a, b] }, { events: [a, wrong] }],
    "2026-10-21",
  );
  assert.deepEqual(
    fixtures.map((f) => f.id),
    [101, 102],
  );
  assert.ok(
    fixtures.every((f) => madridDate(new Date(f.kickoff)) === "2026-10-21"),
  );
  assert.equal(fixtures[0].home.name, "Local");
  assert.equal(fixtures[0].away.name, "Visitante");
  assert.deepEqual(fixtures[0].score, { home: "2", away: "1" });
});
test("Madrid date filter follows winter offset and the DST transition", () => {
  const winter = normalizeEspnBoards(
    [
      {
        events: [
          event("101", "2026-12-01T23:30:00Z"),
          event("102", "2026-12-02T23:00:00Z"),
        ],
      },
    ],
    "2026-12-02",
  );
  assert.deepEqual(
    winter.map((f) => f.id),
    [101],
  );
  const transition = normalizeEspnBoards(
    [
      {
        events: [
          event("101", "2026-10-24T22:30:00Z"),
          event("102", "2026-10-25T22:30:00Z"),
          event("103", "2026-10-25T23:00:00Z"),
        ],
      },
    ],
    "2026-10-25",
  );
  assert.deepEqual(
    transition.map((f) => f.id),
    [101, 102],
  );
});
test("missing football setting defaults to real ESPN and demo does not override a real provider", () => {
  assert.equal(resolveFootballSource(undefined), "espn");
  assert.throws(() => resolveFootballSource("typo"));
  const oldProvider = process.env.FOOTBALL_PROVIDER;
  const oldDemo = process.env.NEXT_PUBLIC_DEMO_MODE;
  try {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    process.env.FOOTBALL_PROVIDER = "api-football";
    assert.equal(getConfig().footballProvider, "api-football");
    assert.equal(getConfig().footballMock, false);
    process.env.FOOTBALL_PROVIDER = "espn";
    assert.equal(getConfig().footballMock, false);
    process.env.FOOTBALL_PROVIDER = "mock";
    assert.equal(getConfig().footballMock, true);
  } finally {
    if (oldProvider === undefined) delete process.env.FOOTBALL_PROVIDER;
    else process.env.FOOTBALL_PROVIDER = oldProvider;
    if (oldDemo === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
    else process.env.NEXT_PUBLIC_DEMO_MODE = oldDemo;
  }
});
test("empty source stays empty; invalid responses never create sample fixtures", () => {
  assert.deepEqual(normalizeEspnBoards([{ events: [] }], "2026-10-21"), []);
  assert.throws(() => normalizeEspnBoards([{}], "2026-10-21"), /no válida/);
});
test("ESPN queries adjacent provider days and refuses failed responses without mock fallback", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return Response.json({ events: [event("101", "2026-10-21T19:00:00Z")] });
    };
    const items = await new EspnFootballProvider().fixtures("2026-10-21");
    assert.equal(items.length, 1);
    assert.equal(calls.length, 3);
    assert.ok(calls.some((x) => x.includes("dates=20261020")));
    assert.ok(calls.some((x) => x.includes("dates=20261022")));
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(
      () => new EspnFootballProvider().fixtures("2026-10-21"),
      /no pudo consultar/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
