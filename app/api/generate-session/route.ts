import { resolveGenerationSubject } from "@/lib/generation-subject";
import { NextResponse } from "next/server";
import { readGenerationRequest } from "@/lib/generation-request";
import { AppError, errorResponse, protectMutation } from "@/lib/errors";
import { getConfig } from "@/lib/config";
import { footballProvider } from "@/lib/adapters/football";
import { OpenAIImageProvider } from "@/lib/adapters/images";
import { buildDesignPrompt } from "@/lib/prompt";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    protectMutation(req);
    const { input, files, apiKey } = await readGenerationRequest(req);
    if (apiKey.length < 20)
      throw new AppError(
        "Introduce tu clave temporal de OpenAI en Conexión. No se guardará.",
        401,
      );
    const fixture = await resolveGenerationSubject(input, (date) =>
      footballProvider(getConfig().footballProvider).fixtures(date),
    );
    const prompt = buildDesignPrompt(fixture, input.settings, input.references);
    const image = await new OpenAIImageProvider(apiKey).generate(
      fixture,
      input.settings,
      prompt,
      files,
    );
    return new Response(new Uint8Array(image.bytes).buffer, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
