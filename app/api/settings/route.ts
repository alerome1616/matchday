import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { defaultSettings } from "@/lib/defaults";
import { requireUser } from "@/lib/supabase/server";
import { settingsSchema } from "@/lib/validation";
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
    const { db, user } = await requireUser();
    const { error } = await db
      .from("design_settings")
      .upsert({
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
