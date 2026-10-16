import { connection, NextResponse } from "next/server";
import { TRACKED_CLUBS } from "@/lib/drafts/clubs";
import { importClub, type ImportResult } from "@/lib/drafts/importer";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 300;

// Weekly (vercel.json): refreshes player club histories from Wikidata.
// ?club=Arsenal%20F.C. imports one club, handy for a first run or a fix.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const only = new URL(request.url).searchParams.get("club");
  const clubs = only ? TRACKED_CLUBS.filter((c) => c.wikipedia === only) : TRACKED_CLUBS;
  if (!clubs.length) return NextResponse.json({ error: `Not a tracked club: ${only}` }, { status: 400 });

  const started = Date.now();
  const results: ImportResult[] = [];
  for (const club of clubs) {
    // Leave room to answer before the platform cuts the request off.
    if (Date.now() - started > 240_000) {
      results.push({ club: club.name, error: "Out of time this run. Call again with ?club= for the rest." });
      continue;
    }
    try {
      results.push(await importClub(club));
    } catch (e) {
      results.push({ club: club.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const failed = results.filter((r) => "error" in r).length;
  return NextResponse.json({ results, failed }, { status: failed === results.length ? 502 : 200 });
}
