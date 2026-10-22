import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { defaultSettings } from "@/lib/defaults";
import { requireUser } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation";
import { requireAccount } from "@/lib/auth";
import { database } from "@/lib/database";
import { decodeStoredJson } from "@/lib/gallery-records";
import {
  AppError,
  errorResponse,
  protectMutation,
  readJson,
} from "@/lib/errors";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (getConfig().demo)
      return NextResponse.json({ settings: defaultSettings });
    if (getConfig().authProvider === "postgres") {
      const user = await requireAccount();
      const [row] = await database().query<{ settings: unknown }>(
        "SELECT settings FROM matchday_settings WHERE user_id=$1",
        [user.id],
      );
      return NextResponse.json(
        { settings: decodeStoredJson(row?.settings) ?? defaultSettings },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const { db, user } = await requireUser();
    const { data, error } = await db
      .from("design_settings")
      .select("settings")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json(
      { settings: data?.settings ?? defaultSettings },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(req: Request) {
  try {
    protectMutation(req);
    if (getConfig().demo)
      throw new AppError(
        "En demo, la configuración se guarda en este navegador.",
      );
    const settings = settingsSchema.parse(await readJson(req));
    if (getConfig().authProvider === "postgres") {
      const user = await requireAccount();
      await database().query(
        `INSERT INTO matchday_settings (user_id,settings) VALUES ($1,$2::jsonb)
        ON CONFLICT (user_id) DO UPDATE SET settings=excluded.settings`,
        [user.id, settings],
      );
      return NextResponse.json({ settings });
    }
    const { db, user } = await requireUser();
    const { error } = await db.from("design_settings").upsert({
      user_id: user.id,
      settings,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ settings });
  } catch (e) {
    return errorResponse(e);
  }
}
