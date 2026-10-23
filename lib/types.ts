export type Team = {
  id: number;
  name: string;
  short: string;
  color: string;
  logo?: string;
};
export type Fixture = {
  id: number;
  home: Team;
  away: Team;
  league: string;
  country: string;
  kickoff: string;
  venue: string;
  status: string;
  score?: { home: string; away: string };
};
export type DesignStyle =
  "cinematic" | "minimal" | "matchday" | "retro" | "epic";
export type Settings = {
  prompt: string;
  style: DesignStyle;
  format: "story" | "square" | "landscape";
  quality: "low" | "medium" | "high";
  scene?: "stadium" | "interior" | "editorial" | "custom";
  headline?: string;
};
export type FreeDesign = { kind: "free" };
export type DesignSubject = Fixture | FreeDesign;
export function isFreeDesign(subject: DesignSubject): subject is FreeDesign {
  return "kind" in subject && subject.kind === "free";
}
export type GalleryImage = {
  id: string;
  fixture: DesignSubject;
  settings: Settings;
  prompt: string;
  created_at: string;
  url: string;
  demo: boolean;
};
export type RuntimeConfig = {
  authProvider: "postgres" | "supabase" | "local";
  demo: boolean;
  footballMock: boolean;
  footballProvider: import("./football-config").FootballSource;
  imageMock: boolean;
  configured: boolean;
  generationConfigured: boolean;
};
export type StudioUser = { id: string; email?: string };
export type ApiKeyStatus = {
  available: boolean;
  saved: boolean;
  suffix?: string;
  updatedAt?: string;
};

export type FixturesSource = {
  name: string;
  url: string;
  fetchedAt: string;
  timezone: string;
  mock: boolean;
};

export type ReferenceImage = import("./creative").ReferenceInstruction & {
  id: string;
  file: File;
  preview: string;
};
