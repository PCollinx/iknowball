import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 60;

// Daily at 22:00 WAT (vercel.json): buzzes the admins' phones when the full time
// X post is ready on the maker's Posts tab. Logged in the control room.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const run = await runJob("posts-evening");
  return NextResponse.json(run, { status: run.status === "failed" ? 500 : 200 });
}
