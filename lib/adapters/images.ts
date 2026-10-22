import "server-only";
import { formats } from "../defaults";
import type { Fixture, Settings } from "../types";
import { AppError } from "../errors";
export type ImageResult = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  demo: boolean;
};
export interface ImageProvider {
  generate(
    fixture: Fixture,
    settings: Settings,
    prompt: string,
    references?: File[],
  ): Promise<ImageResult>;
}
export class MockImageProvider implements ImageProvider {
  async generate(): Promise<ImageResult> {
    throw new AppError(
      "La generación de plantillas de muestra está desactivada. Conecta OpenAI para crear una imagen real.",
      503,
    );
  }
}
export class OpenAIImageProvider implements ImageProvider {
  constructor(private readonly sessionKey?: string) {}
  async generate(
    _fixture: Fixture,
    s: Settings,
    prompt: string,
    references: File[] = [],
  ): Promise<ImageResult> {
    const key = this.sessionKey || process.env.OPENAI_API_KEY;
    if (!key)
      throw new AppError(
        "Introduce tu clave de OpenAI en Conexión o configura la clave del servidor.",
        503,
      );
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst";
    const params = {
      model,
      prompt,
      n: 1,
      size: formats[s.format].size,
      quality: s.quality,
      output_format: "png",
    };
    const headers: Record<string, string> = { Authorization: "Bearer " + key };
    let body: BodyInit;
    let endpoint = "https://api.openai.com/v1/images/generations";
    if (references.length) {
      endpoint = "https://api.openai.com/v1/images/edits";
      const form = new FormData();
      for (const [name, value] of Object.entries(params))
        form.set(name, String(value));
      references.forEach((file, index) =>
        form.append(
          "image[]",
          file,
          "reference-" +
            (index + 1) +
            "." +
            (file.type === "image/jpeg"
              ? "jpg"
              : file.type === "image/webp"
                ? "webp"
                : "png"),
        ),
      );
      body = form;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(params);
    }
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(240000),
      });
    } catch {
      throw new AppError(
        "OpenAI no respondió a tiempo. Revisa la galería antes de repetir la generación.",
        504,
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new AppError(
        response.status === 401
          ? "OpenAI no acepta esta clave. Revísala en Conexión."
          : response.status === 429
            ? "OpenAI ha alcanzado su límite de uso o de saldo. Revisa tu cuenta."
            : response.status === 400
              ? "OpenAI rechazó la solicitud. Revisa el prompt, las imágenes y el modelo."
              : "No se pudo generar la imagen con OpenAI.",
        response.status === 401 ? 401 : 502,
      );
    }
    const result = (await response.json()) as {
      data?: { b64_json?: string }[];
    };
    const b64 = result.data?.[0]?.b64_json;
    if (!b64 || b64.length > 32 * 1024 * 1024)
      throw new AppError(
        "OpenAI no devolvió una imagen válida dentro del tamaño permitido.",
        502,
      );
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return { bytes, contentType: "image/png", extension: "png", demo: false };
  }
}
export function imageProvider(mock: boolean): ImageProvider {
  return mock ? new MockImageProvider() : new OpenAIImageProvider();
}
