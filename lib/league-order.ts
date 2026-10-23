import type { Fixture } from "./types";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const nationalLeagues = [
  /^(la ?liga(?: .*|)?|primera division|laliga ea sports)$/,
  /^premier league$/,
  /^serie a$/,
  /^ligue 1(?: .*|)?$/,
  /^(?:1\. )?bundesliga$/,
  /^eredivisie$/,
  /^(primeira liga|liga portugal(?: .*|)?|liga nos|liga)$/,
];
const countries = [
  ["spain", "espana", "esp"],
  ["england", "inglaterra", "eng"],
  ["italy", "italia", "ita"],
  ["france", "francia", "fra"],
  ["germany", "alemania", "deutschland", "ger"],
  ["netherlands", "paises bajos", "holanda", "ned"],
  ["portugal", "por"],
];
export function leaguePriority(fixture: Pick<Fixture, "league" | "country">) {
  const league = normalize(fixture.league),
    country = normalize(fixture.country);
  if (/^(uefa )?(champions league|liga de campeones)(?: .*|)?$/.test(league))
    return 0;
  if (/^(uefa )?(europa league|liga europa)(?: .*|)?$/.test(league)) return 1;
  const prefixes = [
    "spanish",
    "english",
    "italian",
    "french",
    "german",
    "dutch",
    "portuguese",
  ];
  const explicitCountry = prefixes.findIndex((prefix) =>
    league.startsWith(prefix + " "),
  );
  const leagueName =
    explicitCountry < 0
      ? league
      : league.slice(prefixes[explicitCountry].length + 1);
  const index = nationalLeagues.findIndex(
    (pattern, i) =>
      pattern.test(leagueName) &&
      (explicitCountry >= 0
        ? explicitCountry === i
        : !country || countries[i].includes(country)),
  );
  return index < 0 ? 100 : index + 2;
}
// Sort a copy. Preserve the provider's names and order within each competition.
export function orderFixtures(fixtures: Fixture[]) {
  return fixtures
    .map((fixture, index) => ({ fixture, index }))
    .sort(
      (a, b) =>
        leaguePriority(a.fixture) - leaguePriority(b.fixture) ||
        a.index - b.index,
    )
    .map(({ fixture }) => fixture);
}
