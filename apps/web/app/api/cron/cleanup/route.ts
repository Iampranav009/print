import { runCleanup } from "@/lib/retention";

// Daily backstop (vercel.json) for when no app traffic triggers the regular cleanup.
// Vercel sends `Authorization: Bearer $CRON_SECRET`; without the env var the route stays closed.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await runCleanup(), { headers: { "Cache-Control": "no-store" } });
}
