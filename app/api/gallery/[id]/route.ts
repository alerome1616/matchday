import { NextResponse } from "next/server";
import { bucket } from "@/lib/config";
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
