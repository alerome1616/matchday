import "server-only";
import { z } from "zod";
import type { Database } from "./database";
import type { StudioUser } from "./types";
import { AppError } from "./errors";
import {
  hashPassword,
  newSessionToken,
  tokenHash,
  verifyPassword,
} from "./passwords";

export const credentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(128),
  })
  .strict();
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export function createAccounts(db: Database) {
  async function throttle(email: string, network: string) {
    // Durable counters are shared by all Vercel instances; no passwords/IPs are stored.
    for (const [key, limit] of [
      [`email:${email}`, 8],
      [`network:${network}`, 40],
    ] as const) {
      const [row] = await db.query<{ attempts: number }>(
        `INSERT INTO matchday_auth_limits (key_hash, attempts, expires_at)
        VALUES ($1, 1, now() + interval '15 minutes')
        ON CONFLICT (key_hash) DO UPDATE SET attempts = CASE WHEN matchday_auth_limits.expires_at < now() THEN 1 ELSE matchday_auth_limits.attempts + 1 END,
        expires_at = CASE WHEN matchday_auth_limits.expires_at < now() THEN now() + interval '15 minutes' ELSE matchday_auth_limits.expires_at END
        RETURNING attempts`,
        [tokenHash(key)],
      );
      if (row.attempts > limit)
        throw new AppError(
          "Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.",
          429,
        );
    }
  }
  async function session(user: StudioUser) {
    const token = newSessionToken();
    await db.query("DELETE FROM matchday_sessions WHERE expires_at <= now()");
    await db.query(
      `INSERT INTO matchday_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')`,
      [tokenHash(token), user.id],
    );
    return { user, token };
  }
  return {
    async register(input: unknown, network: string) {
      const { email, password } = credentialsSchema.parse(input);
      await throttle(email, network);
      const id = crypto.randomUUID();
      const hash = await hashPassword(password);
      const rows = await db.query<StudioUser>(
        `INSERT INTO matchday_users (id, email, password_hash) VALUES ($1,$2,$3)
        ON CONFLICT (email) DO NOTHING RETURNING id,email`,
        [id, email, hash],
      );
      if (!rows.length)
        throw new AppError(
          "No se pudo crear la cuenta con esos datos. Si ya te registraste, inicia sesión.",
          409,
        );
      return session(rows[0]);
    },
    async login(input: unknown, network: string) {
      const { email, password } = credentialsSchema.parse(input);
      await throttle(email, network);
      const [user] = await db.query<StudioUser & { password_hash: string }>(
        "SELECT id,email,password_hash FROM matchday_users WHERE email=$1",
        [email],
      );
      const verified = await verifyPassword(password, user?.password_hash);
      if (!user || !verified)
        throw new AppError("El correo o la contraseña no son correctos.", 401);
      return session({ id: user.id, email: user.email });
    },
    async current(token?: string): Promise<StudioUser | null> {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const [user] = await db.query<StudioUser>(
        `SELECT u.id,u.email FROM matchday_users u
        JOIN matchday_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()`,
        [tokenHash(token)],
      );
      return user ?? null;
    },
    async logout(token?: string) {
      if (token)
        await db.query("DELETE FROM matchday_sessions WHERE token_hash=$1", [
          tokenHash(token),
        ]);
    },
  };
}
