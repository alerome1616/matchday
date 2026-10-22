import { get } from "@vercel/blob";
import { z } from "zod";
import { requireAccount } from "@/lib/auth";
import { ownImage } from "@/lib/own-gallery";
import { AppError, errorResponse } from "@/lib/errors";
import { getConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (getConfig().authProvider !== "postgres")
      throw new AppError("Imagen no encontrada.", 404);
    const user = await requireAccount();
    const row = await ownImage(
      user.id,
      z
        .string()
        .uuid()
        .parse((await params).id),
    );
    const result = await get(row.storage_path, { access: "private" });
    if (!result || result.statusCode !== 200)
      throw new AppError("Imagen no encontrada.", 404);
    return new Response(result.stream, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
