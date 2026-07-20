import { handleJmaWarningsRequest } from "@/server/jmaWarningsRoute";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleJmaWarningsRequest(request);
}
