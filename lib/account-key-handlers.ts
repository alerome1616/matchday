import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, protectMutation, readJson } from "./errors";
import type { ApiKeyStatus } from "./types";

const schema = z
  .object({
    apiKey: z
      .string()
      .trim()
      .min(20)
      .max(512)
      .regex(/^sk-[A-Za-z0-9_-]+$/),
  })
  .strict();
type Dependencies = {
  authenticate: () => Promise<string>;
  status: (owner: string) => Promise<ApiKeyStatus>;
  save: (owner: string, value: string) => Promise<ApiKeyStatus>;
  remove: (owner: string) => Promise<ApiKeyStatus>;
};
const headers = { "Cache-Control": "private, no-store" };
// Ownership always comes from the verified session, never from request data.
export function createAccountKeyHandlers(deps: Dependencies) {
  return {
    async GET() {
      try {
        return NextResponse.json(await deps.status(await deps.authenticate()), {
          headers,
        });
      } catch (e) {
        const response = errorResponse(e);
        response.headers.set("Cache-Control", headers["Cache-Control"]);
        return response;
      }
    },
    async PUT(req: Request) {
      try {
        protectMutation(req);
        const owner = await deps.authenticate();
        const { apiKey } = schema.parse(await readJson(req));
        return NextResponse.json(await deps.save(owner, apiKey), { headers });
      } catch (e) {
        // Never return validation details containing the supplied credential.
        const response = errorResponse(e);
        response.headers.set("Cache-Control", headers["Cache-Control"]);
        return response;
      }
    },
    async DELETE(req: Request) {
      try {
        protectMutation(req);
        return NextResponse.json(await deps.remove(await deps.authenticate()), {
          headers,
        });
      } catch (e) {
        const response = errorResponse(e);
        response.headers.set("Cache-Control", headers["Cache-Control"]);
        return response;
      }
    },
  };
}
