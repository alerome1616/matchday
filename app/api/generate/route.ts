import { NextResponse } from "next/server";
import { getConfig, bucket } from "@/lib/config";
import { footballProvider } from "@/lib/adapters/football";
import { OpenAIImageProvider } from "@/lib/adapters/images";
import { readUserApiKey } from "@/lib/user-api-key";
import { requireUser } from "@/lib/supabase/server";
import { readGenerationRequest } from "@/lib/generation-request";
import { buildPrompt } from "@/lib/prompt";
import { AppError, errorResponse, protectMutation } from "@/lib/errors";
import { generateOwn } from "@/lib/own-generation";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    protectMutation(req);
    const config = getConfig();
    if (config.authProvider === "postgres") return await generateOwn(req);
    if (config.demo)
      throw new AppError(
        "Introduce una clave temporal en Conexión o activa la generación del servidor.",
      );
    const { input, files, apiKey } = await readGenerationRequest(req);
    if (apiKey && apiKey.length < 20)
      throw new AppError("La clave temporal no es válida.");
    if (input.fixtureIds.length !== 1)
      throw new AppError("Genera un partido por solicitud.");
    const { db, user } = await requireUser();
    const generationKey =
      apiKey || (await readUserApiKey(user.id)) || process.env.OPENAI_API_KEY;
    if (!generationKey)
      throw new AppError(
        "Guarda tu clave de OpenAI en tu cuenta para generar imágenes.",
        400,
      );
    const fixtures = await footballProvider(config.footballProvider).fixtures(
      input.date,
    );
    const fixture = fixtures.find((f) => f.id === input.fixtureIds[0]);
    if (!fixture) throw new AppError("El partido ya no está disponible.", 404);
    const { data: existing } = await db
      .from("generated_images")
      .select("id")
      .eq("request_id", input.requestId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing)
      return NextResponse.json({ id: existing.id, alreadyGenerated: true });
    const { error: reserveError } = await db.rpc("reserve_generation", {
      p_request_id: input.requestId,
    });
    if (reserveError)
      throw new AppError(
        reserveError.message.includes("daily_limit")
          ? "Has alcanzado el límite diario de 20 diseños."
          : reserveError.message.includes("active_limit")
            ? "Ya hay una generación en curso. Espera a que termine."
            : "Esta solicitud ya se procesó. Revisa la galería.",
        429,
      );
    try {
      const prompt = buildPrompt(fixture, input.settings, input.references);
      const result = await new OpenAIImageProvider(generationKey).generate(
        fixture,
        input.settings,
        prompt,
        files,
      );
      const id = crypto.randomUUID();
      const storagePath = user.id + "/" + id + "." + result.extension;
      const { error: uploadError } = await db.storage
        .from(bucket)
        .upload(storagePath, result.bytes, {
          contentType: result.contentType,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { error: insertError } = await db.from("generated_images").insert({
        id,
        user_id: user.id,
        request_id: input.requestId,
        storage_path: storagePath,
        fixture,
        settings: input.settings,
        prompt,
        demo: result.demo,
      });
      if (insertError) {
        await db.storage.from(bucket).remove([storagePath]);
        throw insertError;
      }
      await db
        .from("generation_requests")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("id", input.requestId)
        .eq("user_id", user.id);
      return NextResponse.json({ id }, { status: 201 });
    } catch (e) {
      await db
        .from("generation_requests")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", input.requestId)
        .eq("user_id", user.id);
      throw e;
    }
  } catch (e) {
    return errorResponse(e);
  }
}
