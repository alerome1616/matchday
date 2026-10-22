import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "../errors";

// This client must never receive session cookies or be imported by the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret)
    throw new AppError(
      "El guardado de claves está pendiente de configurar en el servidor.",
      503,
    );
  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
