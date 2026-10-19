import { connection, NextResponse } from "next/server";
import { syncFixtures } from "@/lib/fixtures/sync";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 60;

// Nightly at 00:30 WAT (vercel.json), after the evening's matches: the
// season's Premier League fixtures and results from Highlightly, about 4 calls.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await syncFixtures());
}
