import "server-only";
import { AppError } from "./errors";

// AAD binds encrypted credentials to their owner, even if database rows move.
export function keyEncryptionConfigured() {
  return /^[a-f\d]{64}$/i.test(process.env.API_KEY_ENCRYPTION_SECRET ?? "");
}
async function encryptionKey() {
  if (!keyEncryptionConfigured())
    throw new AppError(
      "El guardado de claves está pendiente de configurar en el servidor.",
      503,
    );
  return crypto.subtle.importKey(
    "raw",
    Buffer.from(process.env.API_KEY_ENCRYPTION_SECRET!, "hex"),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptApiKey(value: string, owner: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(owner) },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return JSON.stringify({
    v: 1,
    iv: Buffer.from(iv).toString("base64"),
    data: Buffer.from(encrypted).toString("base64"),
  });
}
export async function decryptApiKey(envelope: string, owner: string) {
  const key = await encryptionKey();
  try {
    const { v, iv, data } = JSON.parse(envelope);
    if (v !== 1 || typeof iv !== "string" || typeof data !== "string")
      throw new Error();
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: Buffer.from(iv, "base64"),
        additionalData: new TextEncoder().encode(owner),
      },
      key,
      Buffer.from(data, "base64"),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new AppError(
      "No se pudo abrir tu clave guardada. Vuelve a guardarla en Conectar OpenAI.",
      503,
    );
  }
}
