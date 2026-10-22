import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAccounts } from "@/lib/accounts";
import { database } from "@/lib/database";
import { setSessionCookie, sessionCookie } from "@/lib/auth";
import {
  AppError,
  errorResponse,
  protectMutation,
  readJson,
} from "@/lib/errors";
import { getConfig } from "@/lib/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    if (
      (await params).action !== "session" ||
      getConfig().authProvider !== "postgres"
    )
      throw new AppError("Ruta no disponible.", 404);
    const user = await createAccounts(database()).current(
      (await cookies()).get(sessionCookie())?.value,
    );
    return NextResponse.json({ user }, { headers });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    protectMutation(req);
    if (getConfig().authProvider !== "postgres")
      throw new AppError(
        "Activa la base de datos propia para utilizar estas cuentas.",
        503,
      );
    const action = (await params).action;
    const accounts = createAccounts(database());
    const jar = await cookies();
    const previousToken = jar.get(sessionCookie())?.value;
    if (action === "logout") {
      await accounts.logout(previousToken);
      jar.delete(sessionCookie());
      return NextResponse.json({ ok: true }, { headers });
    }
    if (action !== "login" && action !== "register")
      throw new AppError("Ruta no disponible.", 404);
    const network = process.env.VERCEL
      ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
      : "local";
    const result = await accounts[action](await readJson(req), network);
    await accounts.logout(previousToken);
    await setSessionCookie(result.token);
    return NextResponse.json({ user: result.user }, { headers });
  } catch (e) {
    return errorResponse(e);
  }
}
