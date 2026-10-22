import test from "node:test";
import assert from "node:assert/strict";
import { toggleMatch, selectVisible } from "../lib/selection";
import { mockFixtures } from "../lib/mock";
test("selection retains several dates and accepts more than four matches", () => {
  const today = mockFixtures("2026-10-22");
  const tomorrow = mockFixtures("2026-10-23");
  let selected = selectVisible([], today, "2026-10-22");
  selected = selectVisible(selected, tomorrow, "2026-10-23");
  assert.equal(selected.length, today.length + tomorrow.length);
  assert.ok(selected.length > 4);
  assert.equal(selected[0].date, "2026-10-22");
  assert.equal(selected.at(-1)?.date, "2026-10-23");
  const remaining = selectVisible(selected, tomorrow, "2026-10-23");
  assert.deepEqual(
    remaining.map((x) => x.date),
    today.map(() => "2026-10-22"),
  );
});
test("selection deduplicates a date and toggling or removing a view preserves other dates", () => {
  const fixtures = mockFixtures("2026-10-22");
  let selected = toggleMatch([], fixtures[0], "2026-10-22");
  selected = toggleMatch(selected, fixtures[0], "2026-10-23");
  selected = selectVisible(selected, fixtures, "2026-10-22");
  assert.equal(new Set(selected.map((x) => x.key)).size, selected.length);
  selected = toggleMatch(selected, fixtures[0], "2026-10-22");
  assert.ok(selected.some((x) => x.key === `2026-10-23:${fixtures[0].id}`));
  assert.ok(!selected.some((x) => x.key === `2026-10-22:${fixtures[0].id}`));
});
