import "server-only";
import { getRun, playerName, type RunRow, type SetRow } from "@/lib/clash/data";
import { STATS } from "@/lib/clash/rules";
import { challengePlayed } from "./copy";
import { blow, devicesFor, whistleReady } from "./send";

/**
 * A mate finished one of your challenges: tell the setter, beaten or not
 * (Collins, 7 Nov 2026). Runs after the mate's full time is served; once
 * per mate per set, however often they look at it.
 */
export async function whistleChallenge(set: SetRow, run: RunRow): Promise<void> {
  if (!whistleReady() || !set.created_by || !run.submitted_at || run.user_id === set.created_by || set.stat === "sample") return;
  const setterId = set.created_by;
  const devices = await devicesFor("challenges", [setterId]);
  if (!devices.length) return;
  const setter = await getRun(set.id, setterId);
  if (!setter?.submitted_at) return;
  const name = await playerName(run.user_id);
  await blow(
    devices,
    `clash:${set.id}:${run.user_id}`,
    challengePlayed({ name, theirs: run.right_count, mine: setter.right_count, stat: STATS[set.stat].short, code: set.code }),
    24 * 3600,
  );
}
