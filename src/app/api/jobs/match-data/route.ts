import { connection, NextResponse } from "next/server";
import { isAuthorizedJob } from "@/lib/jobs";
import { syncMatchData } from "@/lib/matchdata/sync";

export const maxDuration = 300;

// Nightly at 01:00 WAT (vercel.json), after the fixture sync: the Premier
// League table, the coming pairs' last ten meetings and finished matches'
// goals, cards and box scores (template build D).
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await syncMatchData());
}
