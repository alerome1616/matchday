import "server-only";
import { AppError, readJson } from "./errors";
import { generationSchema } from "./validation";
import {
  MAX_REFERENCE_FILES,
  MAX_REFERENCE_BYTES,
  MAX_TOTAL_REFERENCE_BYTES,
} from "./creative";
export async function validateReferenceFiles(files: File[]) {
  if (files.length > MAX_REFERENCE_FILES)
    throw new AppError("Puedes adjuntar hasta 4 imágenes.");
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_REFERENCE_BYTES)
    throw new AppError("Las referencias no pueden superar 4 MB en total.", 413);
  for (const file of files) {
    if (!file.size || file.size > MAX_REFERENCE_BYTES)
      throw new AppError(
        "Cada referencia debe ocupar entre 1 byte y 4 MB.",
        413,
      );
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const png =
      b.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
    const jpeg = b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
    const text = new TextDecoder("ascii").decode(b);
    const webp = text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
    if (!(
      (file.type === "image/png" && png) ||
      (file.type === "image/jpeg" && jpeg) ||
      (file.type === "image/webp" && webp)
    ))
      throw new AppError("Adjunta imágenes PNG, JPG o WebP válidas.");
  }
}
export async function readGenerationRequest(req: Request) {
  if (!req.headers.get("content-type")?.includes("multipart/form-data"))
    return {
      input: generationSchema.parse(await readJson(req)),
      files: [] as File[],
      apiKey: "",
    };
  const limit = MAX_TOTAL_REFERENCE_BYTES + 65536;
  const reader = req.body?.getReader();
  if (!reader) throw new AppError("La solicitud está vacía.");
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new AppError(
        "La solicitud supera el límite de 4 MB de referencias.",
        413,
      );
    }
    parts.push(new Uint8Array(value));
  }
  const multipart = new Response(new Blob(parts), {
    headers: { "content-type": req.headers.get("content-type")! },
  });
  let form: FormData;
  try {
    form = await multipart.formData();
  } catch {
    throw new AppError("No se pudo leer la solicitud de imágenes.");
  }
  const payload = form.get("payload");
  if (typeof payload !== "string" || payload.length > 16000)
    throw new AppError("Configuración de imagen no válida.");
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch {
    throw new AppError("Configuración de imagen no válida.");
  }
  const input = generationSchema.parse(data);
  const values = form.getAll("references");
  if (values.some((v) => typeof v === "string"))
    throw new AppError("Referencia de imagen no válida.");
  const files = values as File[];
  await validateReferenceFiles(files);
  if (files.length !== input.references.length)
    throw new AppError("Cada imagen debe tener una función asignada.");
  const apiKey = String(form.get("apiKey") ?? "").trim();
  if (apiKey.length > 512) throw new AppError("La clave no es válida.");
  return { input, files, apiKey };
}
