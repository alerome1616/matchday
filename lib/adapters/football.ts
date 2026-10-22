import "server-only";
import { EspnFootballProvider } from "./espn";
import type { FootballSource } from "../football-config";
import { madridDate } from "../date";
import type { Fixture } from "../types";
import { mockFixtures } from "../mock";
import { AppError } from "../errors";
export interface FootballProvider {
  fixtures(date: string): Promise<Fixture[]>;
}
export class MockFootballProvider implements FootballProvider {
  async fixtures(date: string) {
    return mockFixtures(date);
  }
}
type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    venue: { name: string | null };
    status: { short: string };
  };
  league: { name: string; country: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
};
export class ApiFootballProvider implements FootballProvider {
  async fixtures(date: string): Promise<Fixture[]> {
    if (!process.env.FOOTBALL_API_KEY)
      throw new AppError("Falta configurar el proveedor de fútbol.", 503);
    let res: Response;
    try {
      res = await fetch(
        "https://v3.football.api-sports.io/fixtures?date=" +
          date +
          "&timezone=Europe%2FMadrid",
        {
          headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY },
          signal: AbortSignal.timeout(20000),
          cache: "no-store",
        },
      );
    } catch {
      throw new AppError(
        "El proveedor de fútbol no responde. Inténtalo de nuevo.",
        502,
      );
    }
    if (!res.ok)
      throw new AppError(
        res.status === 429
          ? "Límite del proveedor de fútbol alcanzado. Inténtalo más tarde."
          : "No se pudieron consultar los partidos.",
        502,
      );
    const body = (await res.json()) as {
      errors?: Record<string, string> | unknown[];
      response?: ApiFixture[];
    };
    if (body.errors && Object.keys(body.errors).length)
      throw new AppError(
        "El proveedor de fútbol rechazó la consulta. Revisa el plan y la clave.",
        502,
      );
    if (!Array.isArray(body.response))
      throw new AppError("Respuesta de fútbol no válida.", 502);
    return body.response
      .filter((r) => madridDate(new Date(r.fixture.date)) === date)
      .map((r) => ({
        id: r.fixture.id,
        home: {
          ...r.teams.home,
          short: r.teams.home.name.slice(0, 3).toUpperCase(),
          color: "#27624b",
        },
        away: {
          ...r.teams.away,
          short: r.teams.away.name.slice(0, 3).toUpperCase(),
          color: "#6b7280",
        },
        league: r.league.name,
        country: r.league.country,
        kickoff: r.fixture.date,
        venue: r.fixture.venue?.name ?? "Estadio por confirmar",
        status: r.fixture.status.short,
      }));
  }
}
export function footballProvider(source: FootballSource): FootballProvider {
  if (source === "mock") return new MockFootballProvider();
  if (source === "api-football") return new ApiFootballProvider();
  return new EspnFootballProvider();
}
