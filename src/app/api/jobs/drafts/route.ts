import { connection, NextResponse } from "next/server";
import { draftEmptyDays, publishDueDrafts } from "@/lib/drafts/draft-job";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 120;

// Daily at 20:00 WAT (vercel.json): drafts every empty day in the next week,
// then publishes whatever is still a draft for today and tomorrow, so the
// review window closes the evening before a Daily goes live.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const drafts = await draftEmptyDays();
  const published = await publishDueDrafts();
  return NextResponse.json({ ...drafts, published });
}
