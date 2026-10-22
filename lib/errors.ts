import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "Revisa los datos enviados.", details: error.flatten() },
      { status: 400 },
    );
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "[matchday]",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "No se pudo completar la operación. Inténtalo de nuevo." },
    { status: 500 },
  );
}
export function protectMutation(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(req.url);
  let expectedOrigin = requestUrl.origin;

  // Next.js can normalize the internal URL to localhost. Only for loopback
  // requests, recover the browser's actual host without trusting proxy headers.
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const host = req.headers.get("host");
  if (host && loopback.has(requestUrl.hostname)) {
    try {
      const browserUrl = new URL(`${requestUrl.protocol}//${host}`);
      if (
        loopback.has(browserUrl.hostname) &&
        browserUrl.host === host &&
        browserUrl.port === requestUrl.port
      ) {
        expectedOrigin = browserUrl.origin;
      }
    } catch {
      // Invalid Host headers never broaden the permitted origin.
    }
  }
  // In production, Nginx preserves Host while forwarding to a local HTTP port.
  // APP_URL is an explicit server setting; arbitrary forwarded headers are ignored.
  if (process.env.APP_URL && host) {
    try {
      const appUrl = new URL(process.env.APP_URL);
      if (["http:", "https:"].includes(appUrl.protocol) && appUrl.host === host)
        expectedOrigin = appUrl.origin;
    } catch {
      /* Invalid configuration never expands the allowed origin. */
    }
  }
  if (origin !== expectedOrigin)
    throw new AppError("Origen no permitido.", 403);
}
export async function readJson(req: Request) {
  const body = await req.text();
  if (body.length > 16000)
    throw new AppError("Solicitud demasiado grande.", 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError("JSON no válido.");
  }
}
