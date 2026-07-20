import { NextResponse } from "next/server";
import { getJmaWarningDecision } from "@/server/jmaWarningService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spotId = searchParams.get("spotId") ?? "";
  const selected = searchParams.get("selected") ?? "";
  if (!spotId || !Number.isFinite(Date.parse(selected))) return NextResponse.json({ error: "spotId and a valid selected ISO time are required" }, { status: 400 });
  return NextResponse.json(await getJmaWarningDecision(spotId, selected), { headers: { "Cache-Control": "private, max-age=60" } });
}
