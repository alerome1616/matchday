import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(getConfig(), {
    headers: { "Cache-Control": "no-store" },
  });
}
