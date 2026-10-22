import type { Fixture, Team } from "./types";
const team = (
  id: number,
  name: string,
  short: string,
  color: string,
): Team => ({ id, name, short, color });
const teams = [
  team(541, "Real Madrid", "RMA", "#d4ad46"),
  team(496, "Juventus", "JUV", "#202c32"),
  team(42, "Arsenal", "ARS", "#d42d39"),
  team(529, "FC Barcelona", "FCB", "#8c2853"),
  team(157, "Bayern Múnich", "BAY", "#d42e47"),
  team(85, "Paris Saint-Germain", "PSG", "#163c7b"),
  team(50, "Manchester City", "MCI", "#68b4d7"),
  team(505, "Inter de Milán", "INT", "#2855b0"),
  team(40, "Liverpool", "LIV", "#cf313f"),
  team(165, "Borussia Dortmund", "BVB", "#d6b631"),
  team(530, "Atlético de Madrid", "ATM", "#c7484e"),
  team(489, "AC Milan", "MIL", "#b5323c"),
];
export function mockFixtures(date: string): Fixture[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: 900001 + i,
    home: teams[i * 2],
    away: teams[i * 2 + 1],
    league: i < 4 ? "UEFA Champions League" : "Partidos destacados",
    country: "Europa",
    kickoff: date + (i === 0 || i === 3 ? "T16:45:00Z" : "T19:00:00Z"),
    venue: [
      "Santiago Bernabéu",
      "Emirates Stadium",
      "Allianz Arena",
      "Etihad Stadium",
      "Anfield",
      "Metropolitano",
    ][i],
    status: "NS",
  }));
}
