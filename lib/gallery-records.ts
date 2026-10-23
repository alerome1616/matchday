import {
  isFreeDesign,
  type Fixture,
  type GalleryImage,
  type Settings,
} from "./types";

// Older Postgres.js writes serialized JSON twice. Decode it on read so that
// existing files remain usable without regenerating or rewriting them.
export function decodeStoredJson(value: unknown): unknown {
  for (let depth = 0; depth < 3 && typeof value === "string"; depth++) {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return value;
}

function record(value: unknown): Record<string, unknown> | null {
  const decoded = decodeStoredJson(value);
  return decoded && typeof decoded === "object" && !Array.isArray(decoded)
    ? (decoded as Record<string, unknown>)
    : null;
}

export function galleryRecord(value: unknown): GalleryImage | null {
  const row = record(value);
  if (!row || typeof row.id !== "string" || typeof row.url !== "string")
    return null;
  const fixture = record(row.fixture);
  const free = fixture?.kind === "free";
  const home = record(fixture?.home),
    away = record(fixture?.away);
  if (
    !free &&
    (!fixture ||
      !home ||
      !away ||
      typeof home.name !== "string" ||
      typeof away.name !== "string")
  )
    return null;
  return {
    id: row.id,
    url: row.url,
    fixture: free
      ? { kind: "free" }
      : ({
          ...fixture,
          league: typeof fixture!.league === "string" ? fixture!.league : "",
          home: {
            ...home!,
            short:
              typeof home!.short === "string"
                ? home!.short
                : (home!.name as string).slice(0, 3).toUpperCase(),
          },
          away: {
            ...away!,
            short:
              typeof away!.short === "string"
                ? away!.short
                : (away!.name as string).slice(0, 3).toUpperCase(),
          },
        } as Fixture),
    // Preserve historical values. The gallery labels an unknown format instead
    // of guessing the dimensions or dropping the saved image.
    settings: (record(row.settings) ?? {}) as Settings,
    prompt: typeof row.prompt === "string" ? row.prompt : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    demo: row.demo === true,
  };
}

export function galleryRecords(values: unknown) {
  const rows: unknown[] = Array.isArray(values) ? values : [];
  const images = rows
    .map(galleryRecord)
    .filter((image): image is GalleryImage => image !== null);
  return { images, unreadable: rows.length - images.length };
}

export function galleryTitle(image: GalleryImage) {
  return isFreeDesign(image.fixture)
    ? image.settings.headline?.trim() || "Creación libre"
    : image.fixture.home.name + " vs " + image.fixture.away.name;
}
export function galleryCompetition(image: GalleryImage) {
  return isFreeDesign(image.fixture) ? "Creación libre" : image.fixture.league;
}
