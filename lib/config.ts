import "server-only";
import { resolveFootballSource } from "./football-config";
export function getConfig() {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  const footballProvider = resolveFootballSource(process.env.FOOTBALL_PROVIDER);
  const footballMock = footballProvider === "mock";
  const imageMock = demo || process.env.IMAGE_PROVIDER !== "openai";
  const configured = Boolean(
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
  };
}
export const bucket = "match-images";
