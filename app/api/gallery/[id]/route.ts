import { NextResponse } from "next/server";
import { bucket, getConfig } from "@/lib/config";
import { del } from "@vercel/blob";
import { requireAccount } from "@/lib/auth";
import { ownImage } from "@/lib/own-gallery";
import { database } from "@/lib/database";
import { requireUser } from "@/lib/supabase/server";
import { AppError, errorResponse, protectMutation } from "@/lib/errors";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    protectMutation(req);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    if (getConfig().authProvider === "postgres") {
      const user = await requireAccount();
      const row = await ownImage(user.id, id);
      await del(row.storage_path);
      await database().query(
        "DELETE FROM matchday_images WHERE id=$1 AND user_id=$2",
        [id, user.id],
      );
      return NextResponse.json({ ok: true });
    }
    const { db, user } = await requireUser();
    const { data, error } = await db
      .from("generated_images")
      .select("storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new AppError("Imagen no encontrada.", 404);
    const { error: storageError } = await db.storage
      .from(bucket)
      .remove([data.storage_path]);
    if (storageError) throw storageError;
    const { error: deleteError } = await db
      .from("generated_images")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
