import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 60;

// Nightly at 00:30 WAT (vercel.json), after the evening's matches: the
// season's Premier League, Champions League and cup fixtures and results from
// Highlightly, about 12 calls. Logged in the control room (/maker/jobs).
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const run = await runJob("fixtures");
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
}
