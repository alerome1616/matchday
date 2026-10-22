import "server-only";
import { createAdminClient } from "./supabase/admin";
import {
  decryptApiKey,
  encryptApiKey,
  keyEncryptionConfigured,
} from "./key-cipher";
import { AppError } from "./errors";
import type { ApiKeyStatus } from "./types";

export function keyStorageConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SECRET_KEY &&
    keyEncryptionConfigured(),
  );
}
export async function getApiKeyStatus(owner: string): Promise<ApiKeyStatus> {
  if (!keyStorageConfigured()) return { available: false, saved: false };
  const { data, error } = await createAdminClient()
    .from("user_api_credentials")
    .select("key_suffix,updated_at")
    .eq("user_id", owner)
    .maybeSingle();
  if (error)
    throw new AppError(
      "No se pudo consultar tu conexión. Comprueba la migración de claves en Supabase.",
      503,
    );
  return {
    available: true,
    saved: Boolean(data),
    suffix: data?.key_suffix,
    updatedAt: data?.updated_at,
  };
}
export async function saveUserApiKey(
  owner: string,
  value: string,
): Promise<ApiKeyStatus> {
  const encrypted = await encryptApiKey(value, owner);
  const updatedAt = new Date().toISOString();
  const suffix = value.slice(-4);
  const { error } = await createAdminClient()
    .from("user_api_credentials")
    .upsert(
      {
        user_id: owner,
        encrypted_key: encrypted,
        key_suffix: suffix,
        updated_at: updatedAt,
      },
      { onConflict: "user_id" },
    );
  if (error)
    throw new AppError(
      "No se pudo guardar tu clave. Comprueba la migración de claves en Supabase.",
      503,
    );
  return { available: true, saved: true, suffix, updatedAt };
}
export async function deleteUserApiKey(owner: string): Promise<ApiKeyStatus> {
  const { error } = await createAdminClient()
    .from("user_api_credentials")
    .delete()
    .eq("user_id", owner);
  if (error)
    throw new AppError(
      "No se pudo eliminar tu clave. Inténtalo de nuevo.",
      503,
    );
  return { available: keyStorageConfigured(), saved: false };
}
export async function readUserApiKey(
  owner: string,
): Promise<string | undefined> {
  if (!keyStorageConfigured()) return undefined;
  const { data, error } = await createAdminClient()
    .from("user_api_credentials")
    .select("encrypted_key")
    .eq("user_id", owner)
    .maybeSingle();
  if (error) throw new AppError("No se pudo recuperar tu clave guardada.", 503);
  return data ? decryptApiKey(data.encrypted_key, owner) : undefined;
}
