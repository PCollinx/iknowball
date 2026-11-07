import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 120;

// Daily at 09:00 WAT (vercel.json): the whistle's morning buzz, today's Daily
// is up; on Mondays, last week's league finish instead. Logged in the control room.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const run = await runJob("whistle-morning");
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
}
