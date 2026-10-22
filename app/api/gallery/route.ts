import { NextResponse } from "next/server";
import { getConfig, bucket } from "@/lib/config";
import { requireUser } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/errors";
import { requireAccount } from "@/lib/auth";
import { listOwnImages } from "@/lib/own-gallery";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    if (getConfig().demo)
      return NextResponse.json({ images: [], hasMore: false });
    if (getConfig().authProvider === "postgres") {
      const user = await requireAccount();
      const raw = Number(new URL(req.url).searchParams.get("page") ?? 0);
      const page = Number.isInteger(raw) && raw >= 0 ? Math.min(raw, 1000) : 0;
      return NextResponse.json(await listOwnImages(user.id, page), {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    const { db, user } = await requireUser();
    const raw = Number(new URL(req.url).searchParams.get("page") ?? "0");
    const page = Number.isInteger(raw) && raw >= 0 ? Math.min(raw, 1000) : 0;
    const { data, error } = await db
      .from("generated_images")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(page * 24, page * 24 + 24);
    if (error) throw error;
    const rows = (data ?? []).slice(0, 24);
    const { data: urls, error: signError } = await db.storage
      .from(bucket)
      .createSignedUrls(
        rows.map((r) => r.storage_path),
        3600,
      );
    if (rows.length && signError) throw signError;
    return NextResponse.json(
      {
        images: rows.map((r, i) => ({
          id: r.id,
          fixture: r.fixture,
          settings: r.settings,
          prompt: r.prompt,
          created_at: r.created_at,
          url: urls?.[i]?.signedUrl ?? "",
          demo: r.demo,
        })),
        hasMore: (data?.length ?? 0) > 24,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
