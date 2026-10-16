import { connection, NextResponse } from "next/server";
import { TRACKED_CLUBS } from "@/lib/drafts/clubs";
import { clubEndpoint, importClub, type ImportResult } from "@/lib/drafts/importer";
import { isAuthorizedJob } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// A club imported within this window is skipped, so each run picks up where
// the last one stopped and a week's refresh spreads over several runs.
const FRESH_DAYS = 6;
const TIME_BUDGET_MS = 240_000;

// Daily (vercel.json): refreshes player club histories from Wikidata, a few
// clubs per run. ?club=Arsenal%20F.C. imports that one club now, fresh or not.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const only = new URL(request.url).searchParams.get("club");
  let clubs = only ? TRACKED_CLUBS.filter((c) => c.wikipedia === only) : TRACKED_CLUBS;
  if (!clubs.length) return NextResponse.json({ error: `Not a tracked club: ${only}` }, { status: 400 });

  if (!only) {
    const since = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();
    const { data, error } = await createAdminClient()
      .from("api_calls")
      .select("endpoint")
      .eq("source", "wikidata")
      .eq("status_code", 200)
      .gte("called_at", since);
    if (error) throw error;
    const fresh = new Set((data ?? []).map((r) => r.endpoint));
    clubs = clubs.filter((c) => !fresh.has(clubEndpoint(c)));
  }

  const started = Date.now();
  const results: ImportResult[] = [];
  const left: string[] = [];
  for (const club of clubs) {
    // Leave room to answer before the platform cuts the request off.
    if (Date.now() - started > TIME_BUDGET_MS) {
      left.push(club.name);
      continue;
    }
    try {
      results.push(await importClub(club));
    } catch (e) {
      results.push({ club: club.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const failed = results.filter((r) => "error" in r).length;
  return NextResponse.json(
    { results, failed, left, note: left.length ? "Out of time. Run again to carry on." : "All tracked clubs are up to date." },
    { status: results.length && failed === results.length ? 502 : 200 },
  );
}
