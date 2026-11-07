import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 120;

// Daily at 20:00 WAT (vercel.json): the whistle's evening buzz, 4 hours left,
// for anyone yet to start today's Daily. Logged in the control room.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const run = await runJob("whistle-evening");
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
}
