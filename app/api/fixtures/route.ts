import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { footballProvider } from "@/lib/adapters/football";
import { dateSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const config = getConfig();
    if (!config.demo) await requireUser();
    const date = dateSchema.parse(new URL(req.url).searchParams.get("date"));
    const fixtures = await footballProvider(config.footballProvider).fixtures(
      date,
    );
    return NextResponse.json(
      {
        fixtures,
        mock: config.footballMock,
        source: {
          name:
            config.footballProvider === "espn"
              ? "ESPN"
              : config.footballProvider === "api-football"
                ? "API-Football"
                : "Datos de ejemplo",
          url:
            config.footballProvider === "espn"
              ? "https://www.espn.com/soccer/scoreboard/_/date/" +
                date.replaceAll("-", "")
              : config.footballProvider === "api-football"
                ? "https://www.api-football.com/"
                : "",
          fetchedAt: new Date().toISOString(),
          timezone: "Europe/Madrid",
          mock: config.footballMock,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
