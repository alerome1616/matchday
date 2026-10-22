import "server-only";
import { cookies } from "next/headers";
import { database } from "./database";
import { createAccounts, SESSION_SECONDS } from "./accounts";
import { AppError } from "./errors";
import { getConfig } from "./config";

export const sessionCookie = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-matchday_session"
    : "matchday_session";
export async function setSessionCookie(token: string) {
  (await cookies()).set(sessionCookie(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}
export async function ownUser() {
  const user = await createAccounts(database()).current(
    (await cookies()).get(sessionCookie())?.value,
  );
  if (!user) throw new AppError("Inicia sesión para continuar.", 401);
  return user;
}
export async function requireAccount() {
  if (getConfig().authProvider === "postgres") return ownUser();
  return (await (await import("./supabase/server")).requireUser()).user;
}
