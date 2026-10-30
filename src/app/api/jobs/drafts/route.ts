import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 120;

// Daily at 20:00 WAT (vercel.json): drafts every empty day in the next week,
// then publishes whatever is still a draft for today and tomorrow, so the
// review window closes the evening before a Daily goes live. Reports a day
// left without a scheduled Daily. Logged in the control room.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const run = await runJob("drafts");
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
}
