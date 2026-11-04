import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 120;

// Daily at 07:00 WAT (vercel.json): from Fri 20 Nov, the launch email to the
// waitlist (step 17), up to the day's cap; before then, and once everyone has
// had it, it does nothing. Logged in the control room.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const run = await runJob("launch-email");
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
}
