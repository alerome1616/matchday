import "server-only";
import { resolveFootballSource } from "./football-config";
import type { RuntimeConfig } from "./types";
export function getConfig(): RuntimeConfig {
  const authProvider =
    process.env.AUTH_PROVIDER === "postgres" || process.env.DATABASE_URL
      ? "postgres"
      : process.env.NEXT_PUBLIC_DEMO_MODE === "false"
        ? "supabase"
        : "local";
  const demo = authProvider === "local";
  const footballProvider = resolveFootballSource(process.env.FOOTBALL_PROVIDER);
  const footballMock = footballProvider === "mock";
  const imageMock = demo || process.env.IMAGE_PROVIDER !== "openai";
  const configured =
    authProvider === "postgres"
      ? Boolean(process.env.DATABASE_URL)
      : Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        );
  const generationConfigured =
    !demo && configured && !imageMock && Boolean(process.env.OPENAI_API_KEY);
  return {
    demo,
    footballMock,
    footballProvider,
    imageMock,
    configured,
    generationConfigured,
    authProvider,
  };
}
export const bucket = "match-images";
