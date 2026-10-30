import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 300;

// Nightly at 01:00 WAT (vercel.json), after the fixture sync: the Premier
// League table, the coming pairs' last ten meetings and finished matches'
// goals, cards and box scores (template build D). Logged in the control room.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const run = await runJob("match-data");
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
}
