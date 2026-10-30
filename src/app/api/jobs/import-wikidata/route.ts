import { connection, NextResponse } from "next/server";
import { runJob } from "@/lib/control/runs";
import { importProblems } from "@/lib/control/problems";
import { TRACKED_CLUBS } from "@/lib/drafts/clubs";
import { importDueClubs } from "@/lib/drafts/import-job";
import { isAuthorizedJob } from "@/lib/jobs";

export const maxDuration = 300;

// Daily (vercel.json): refreshes player club histories from Wikidata, a few
// clubs per run. ?club=Arsenal%20F.C. imports that one club now, fresh or not.
// Logged in the control room.
export async function GET(request: Request) {
  await connection();
  if (!isAuthorizedJob(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const only = new URL(request.url).searchParams.get("club");
  const club = only ? TRACKED_CLUBS.find((c) => c.wikipedia === only) : undefined;
  if (only && !club) return NextResponse.json({ error: `Not a tracked club: ${only}` }, { status: 400 });

  const run = await runJob(
    "import-wikidata",
    "cron",
    club
      ? async () => {
          const summary = await importDueClubs(club);
          return { summary, problems: importProblems(summary) };
        }
      : undefined,
  );
  return NextResponse.json(run, { status: run.status === "failed" ? 502 : 200 });
}
