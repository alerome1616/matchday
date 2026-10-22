import "server-only";
import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAccount } from "./auth";
import { database } from "./database";
import { readGenerationRequest } from "./generation-request";
import { readUserApiKey, saveUserApiKey } from "./user-api-key";
import { footballProvider } from "./adapters/football";
import { OpenAIImageProvider } from "./adapters/images";
import { buildPrompt } from "./prompt";
import { AppError } from "./errors";
import { getConfig } from "./config";
import { reserveOwnGeneration } from "./own-gallery";

export async function generateOwn(req: Request) {
  const user = await requireAccount();
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new AppError(
      "Conecta el almacén privado de imágenes en Vercel antes de generar.",
      503,
    );
  const { input, files, apiKey } = await readGenerationRequest(req);
  if (input.fixtureIds.length !== 1)
    throw new AppError("Genera un partido por solicitud.");
  // When entered during a signed-in session, keep the personal key for future sessions.
  if (apiKey) await saveUserApiKey(user.id, apiKey);
  const key =
    apiKey || (await readUserApiKey(user.id)) || process.env.OPENAI_API_KEY;
  if (!key) throw new AppError("Añade tu clave de OpenAI para generar.");
  const fixtures = await footballProvider(
    getConfig().footballProvider,
  ).fixtures(input.date);
  const fixture = fixtures.find((f) => f.id === input.fixtureIds[0]);
  if (!fixture)
    throw new AppError(
      "El partido ya no está disponible en la fecha seleccionada.",
      404,
    );
  const db = database();
  const [existing] = await db.query<{ id: string }>(
    "SELECT id FROM matchday_images WHERE user_id=$1 AND request_id=$2",
    [user.id, input.requestId],
  );
  if (existing)
    return NextResponse.json({ id: existing.id, alreadyGenerated: true });
  await reserveOwnGeneration(user.id, input.requestId);
  let uploaded: string | undefined;
  try {
    const prompt = buildPrompt(fixture, input.settings, input.references);
    const image = await new OpenAIImageProvider(key).generate(
      fixture,
      input.settings,
      prompt,
      files,
    );
    const id = crypto.randomUUID();
    const blob = await put(
      `matchday/${user.id}/${id}.png`,
      Buffer.from(image.bytes),
      { access: "private", contentType: "image/png", addRandomSuffix: false },
    );
    uploaded = blob.url;
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO matchday_images (id,user_id,request_id,storage_path,fixture,settings,prompt) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
        [
          id,
          user.id,
          input.requestId,
          blob.url,
          fixture,
          input.settings,
          prompt,
        ],
      );
      await tx.query(
        "UPDATE matchday_generation_requests SET status='succeeded' WHERE id=$1 AND user_id=$2",
        [input.requestId, user.id],
      );
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (uploaded) await del(uploaded).catch(() => undefined);
    await db.query(
      "UPDATE matchday_generation_requests SET status='failed' WHERE id=$1 AND user_id=$2",
      [input.requestId, user.id],
    );
    throw e;
  }
}
