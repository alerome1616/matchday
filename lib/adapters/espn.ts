import "server-only";
import { AppError } from "../errors";
import { orderFixtures } from "../league-order";
import { madridDate } from "../date";
import type { Fixture, Team } from "../types";
import type { FootballProvider } from "./football";
import { z } from "zod";
const teamSchema = z.object({
  id: z.string().regex(/^\d+$/),
  displayName: z.string(),
  abbreviation: z.string().optional(),
  color: z.string().optional(),
  logo: z.string().optional(),
});
const statusSchema = z.object({
  state: z.string().optional(),
  name: z.string().optional(),
  shortDetail: z.string().optional(),
});
const competitionSchema = z.object({
  date: z.string().optional(),
  altGameNote: z.string().optional(),
  venue: z
    .object({
      fullName: z.string().optional(),
      address: z.object({ country: z.string().optional() }).optional(),
    })
    .optional(),
  competitors: z.array(
    z.object({
      homeAway: z.string(),
      team: teamSchema,
      score: z.string().optional(),
    }),
  ),
  status: z.object({ type: statusSchema }).optional(),
});
const eventSchema = z.object({
  id: z.string().regex(/^\d+$/),
  date: z.string(),
  competitions: z.array(competitionSchema).min(1),
  status: z.object({ type: statusSchema }).optional(),
  links: z.array(z.object({ href: z.string() })).optional(),
});
const boardSchema = z.object({ events: z.array(eventSchema) });
const toTeam = (t: z.infer<typeof teamSchema>): Team => ({
  id: Number(t.id),
  name: t.displayName,
  short: t.abbreviation || t.displayName.slice(0, 3).toUpperCase(),
  color: /^[a-fA-F0-9]{6}$/.test(t.color ?? "") ? "#" + t.color : "#27624b",
  logo: t.logo?.startsWith("https://") ? t.logo : undefined,
});
export function normalizeEspnBoards(
  boards: unknown[],
  date: string,
): Fixture[] {
  const unique = new Map<number, Fixture>();
  for (const board of boards) {
    const parsed = boardSchema.safeParse(board);
    if (!parsed.success)
      throw new AppError(
        "ESPN devolvió una respuesta no válida. No se han usado datos de ejemplo.",
        502,
      );
    for (const event of parsed.data.events) {
      const c = event.competitions[0];
      const kickoff = c.date ?? event.date;
      const instant = new Date(kickoff);
      if (Number.isNaN(instant.getTime()))
        throw new AppError(
          "ESPN devolvió una fecha de partido no válida.",
          502,
        );
      if (madridDate(instant) !== date) continue;
      const home = c.competitors.find((t) => t.homeAway === "home");
      const away = c.competitors.find((t) => t.homeAway === "away");
      if (!home || !away)
        throw new AppError(
          "ESPN no identifica los equipos del encuentro.",
          502,
        );
      const state = c.status?.type ?? event.status?.type;
      const status =
        state?.state === "post"
          ? "FT"
          : state?.state === "in"
            ? "LIVE"
            : state?.name === "STATUS_POSTPONED"
              ? "PST"
              : state?.name === "STATUS_CANCELED"
                ? "CANC"
                : "NS";
      unique.set(Number(event.id), {
        id: Number(event.id),
        home: toTeam(home.team),
        away: toTeam(away.team),
        league: c.altGameNote?.split(",")[0]?.trim() || "Otras competiciones",
        country: c.venue?.address?.country ?? "",
        kickoff: instant.toISOString(),
        venue: c.venue?.fullName ?? "Estadio por confirmar",
        status,
        score:
          state?.state === "in" || state?.state === "post"
            ? { home: home.score ?? "0", away: away.score ?? "0" }
            : undefined,
      });
    }
  }
  return orderFixtures(
    [...unique.values()].sort(
      (a, b) =>
        a.kickoff.localeCompare(b.kickoff) ||
        a.league.localeCompare(b.league) ||
        a.id - b.id,
    ),
  );
}
export class EspnFootballProvider implements FootballProvider {
  async fixtures(date: string): Promise<Fixture[]> {
    // Scoreboards use the provider's broadcast day. Query adjacent days and filter
    // by the actual kickoff in Madrid to include midnight matches without leaks.
    const days = [-1, 0, 1].map((offset) => {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10).replaceAll("-", "");
    });
    const boards = await Promise.all(
      days.map(async (day) => {
        let response: Response;
        try {
          response = await fetch(
            "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=" +
              day +
              "&limit=1000",
            {
              signal: AbortSignal.timeout(20000),
              cache: "no-store",
              headers: { Accept: "application/json" },
            },
          );
        } catch {
          throw new AppError(
            "No se pudo conectar con ESPN. Pulsa Actualizar partidos para reintentar.",
            502,
          );
        }
        if (!response.ok)
          throw new AppError(
            "ESPN no pudo consultar la jornada. No se mostrarán partidos de ejemplo.",
            502,
          );
        try {
          return await response.json();
        } catch {
          throw new AppError("ESPN no devolvió una respuesta válida.", 502);
        }
      }),
    );
    return normalizeEspnBoards(boards, date);
  }
}
