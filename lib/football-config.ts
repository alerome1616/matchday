export type FootballSource = "espn" | "api-football" | "mock";
export function resolveFootballSource(value?: string): FootballSource {
  if (!value) return "espn";
  if (value === "espn" || value === "api-football" || value === "mock")
    return value;
  throw new Error("FOOTBALL_PROVIDER debe ser espn, api-football o mock.");
}
