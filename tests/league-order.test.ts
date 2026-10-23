import test from "node:test";
import assert from "node:assert/strict";
import { leaguePriority, orderFixtures } from "../lib/league-order";
import { mockFixtures } from "../lib/mock";
const source = mockFixtures("2026-10-23")[0];
const fixture = (league: string, country = "", id = 1) => ({
  ...source,
  id,
  league,
  country,
});
test("UEFA tournaments lead the requested national league order without changing names or source data", () => {
  const names = [
    "UEFA Champions League",
    "UEFA Europa League",
    "Spanish LALIGA",
    "English Premier League",
    "Italian Serie A",
    "French Ligue 1",
    "German Bundesliga",
    "Dutch Eredivisie",
    "Portuguese Primeira Liga",
    "UEFA Conference League",
    "Other competition",
  ];
  const input = names.map((name, i) => fixture(name, "", i + 1)).reverse();
  const original = structuredClone(input);
  const ordered = orderFixtures(input);
  assert.deepEqual(
    ordered.map((f) => f.league),
    [...names.slice(0, 9), "Other competition", "UEFA Conference League"],
  );
  assert.deepEqual(input, original);
  assert.equal(
    ordered[0],
    input.find((f) => f.league === names[0]),
  );
});
test("national names from API-Football sort correctly and similarly named foreign leagues stay outside that priority", () => {
  const names = [
    fixture("La Liga", "España"),
    fixture("Premier League", "England"),
    fixture("Serie A", "Italy"),
    fixture("Ligue 1", "France"),
    fixture("Bundesliga", "Germany"),
    fixture("Eredivisie", "Netherlands"),
    fixture("Primeira Liga", "Portugal"),
  ];
  assert.deepEqual(orderFixtures([...names].reverse()), names);
  assert.equal(leaguePriority(fixture("Serie A", "Brazil")), 100);
  assert.equal(leaguePriority(fixture("Premier League", "South Africa")), 100);
  assert.equal(leaguePriority(fixture("AFC Champions League", "Asia")), 100);
  assert.equal(leaguePriority(fixture("Portuguese Liga", "Portugal")), 8);
  assert.equal(leaguePriority(fixture("Spanish LALIGA", "USA")), 2);
});
test("days without European tournaments keep the same priority and matches retain their provider order", () => {
  const first = fixture("Spanish LALIGA", "Spain", 1),
    second = fixture("Spanish LALIGA", "Spain", 2),
    french = fixture("French Ligue 1", "France", 3);
  assert.deepEqual(orderFixtures([french, second, first]), [
    second,
    first,
    french,
  ]);
  assert.deepEqual(orderFixtures([]), []);
});
