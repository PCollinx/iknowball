import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrackedClub } from "./clubs";
import { fetchClubExtras, fetchClubPlayers, fetchPlayerFacts, fetchPositions, type PlayerFacts, type Position, type Spell } from "./wikidata";

const BATCH = 500;
// Supabase answers at most this many rows a request.
const HELD_PAGE = 1000;

function chunks<T>(rows: T[]): T[][] {
  return Array.from({ length: Math.ceil(rows.length / BATCH) }, (_, i) => rows.slice(i * BATCH, (i + 1) * BATCH));
}

export type ImportResult = { club: string; players: number; spells: number; positions: number; facts: number; managers: number } | { club: string; error: string };

/** Fetches one club's player histories from Wikidata and upserts them. */
export async function importClub(club: TrackedClub): Promise<ImportResult> {
  const admin = createAdminClient();
  let ok = false;
  try {
    const result = await saveClub(admin, club, await fetchClubPlayers(club.wikipedia));
    ok = !("error" in result);
    return result;
  } finally {
    // status 200 marks a finished import, so the next run can skip this club.
    await admin.from("api_calls").insert({ source: "wikidata", endpoint: clubEndpoint(club), status_code: ok ? 200 : 500 });
  }
}

export const clubEndpoint = (club: TrackedClub) => `club:${club.wikipedia}`;

async function saveClub(admin: ReturnType<typeof createAdminClient>, club: TrackedClub, spells: Spell[]): Promise<ImportResult> {
  if (!spells.length) return { club: club.name, error: "No players found. Check the Wikipedia title." };

  // Keyed on short_name, the key the supporter list (fan_pick clubs) uses too.
  const { data: clubRow, error: clubError } = await admin
    .from("clubs")
    .upsert(
      { wikidata_qid: spells[0].clubQid, name: club.name, short_name: club.short },
      { onConflict: "short_name", ignoreDuplicates: false },
    )
    .select("id")
    .single();
  if (clubError) throw clubError;

  // Players, one row each, keyed by their Wikidata id.
  const byPlayer = new Map<string, Spell>();
  for (const s of spells) byPlayer.set(s.playerQid, s);
  const ids = new Map<string, number>();
  for (const batch of chunks([...byPlayer.values()])) {
    const { data, error } = await admin
      .from("players")
      .upsert(
        batch.map((s) => ({
          wikidata_qid: s.playerQid,
          full_name: s.name,
          known_as: s.name,
          date_of_birth: s.dateOfBirth,
          sitelinks: s.sitelinks,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "wikidata_qid" },
      )
      .select("id, wikidata_qid");
    if (error) throw error;
    for (const p of data ?? []) ids.set(p.wikidata_qid, p.id);
  }

  // Positions (GK, DEF, MID, FWD) place Free Recall shirts on the pitch. Only
  // known ones are written, so a Wikidata hiccup never wipes what we had.
  const positions = await fetchPositions([...byPlayer.keys()]).catch(() => new Map<string, Position>());
  for (const line of ["GK", "DEF", "MID", "FWD"] as const) {
    const qids = [...positions].filter(([, p]) => p === line).map(([q]) => q);
    for (const batch of chunks(qids)) {
      const { error } = await admin.from("players").update({ position: line }).in("wikidata_qid", batch);
      if (error) throw error;
    }
  }

  // Nationality, height and career clubs (template build B). Like positions, a
  // Wikidata hiccup leaves what we had.
  const facts = await fetchPlayerFacts([...byPlayer.keys()]).catch(() => new Map<string, PlayerFacts>());
  const factRows = [...facts].flatMap(([q, f]) => {
    const s = byPlayer.get(q);
    return s ? [{ wikidata_qid: q, full_name: s.name, known_as: s.name, nationality: f.nationality, height_cm: f.heightCm, career_clubs: f.careerClubs }] : [];
  });
  for (const batch of chunks(factRows)) {
    const { error } = await admin.from("players").upsert(batch, { onConflict: "wikidata_qid" });
    if (error) throw error;
  }

  // The club's managers in the Premier League era and its ground.
  const extras = await fetchClubExtras(spells[0].clubQid).catch(() => null);
  if (extras) {
    if (extras.ground) {
      const { error } = await admin.from("clubs").update({ ground: extras.ground.name, ground_capacity: extras.ground.capacity }).eq("id", clubRow.id);
      if (error) throw error;
    }
    if (extras.managers.length) {
      const { error } = await admin.from("club_managers").upsert(
        extras.managers.map((m) => ({
          club_id: clubRow.id,
          wikidata_qid: m.qid,
          name: m.name,
          started_on: m.startedOn,
          ended_on: m.endedOn,
          source_ref: m.statement,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "source_ref" },
      );
      if (error) throw error;
    }
    // Managers Wikidata no longer lists for the club (a vacancy, a correction) go.
    const keep = new Set(extras.managers.map((m) => m.statement));
    const { data: had, error: hadError } = await admin.from("club_managers").select("id, source_ref").eq("club_id", clubRow.id);
    if (hadError) throw hadError;
    const gone = (had ?? []).filter((m) => !keep.has(m.source_ref)).map((m) => m.id);
    if (gone.length) {
      const { error } = await admin.from("club_managers").delete().in("id", gone);
      if (error) throw error;
    }
  }

  const aliases = [...byPlayer.values()].flatMap((s) => s.aliases.map((alias) => ({ player_id: ids.get(s.playerQid)!, alias })));
  for (const batch of chunks(aliases)) {
    const { error } = await admin.from("player_aliases").upsert(batch, { onConflict: "player_id,alias_normalized", ignoreDuplicates: true });
    if (error) throw error;
  }

  for (const batch of chunks(spells)) {
    const { error } = await admin.from("player_spells").upsert(
      batch.map((s) => ({
        player_id: ids.get(s.playerQid)!,
        club_id: clubRow.id,
        joined_on: s.joinedOn,
        left_on: s.leftOn,
        apps: s.apps,
        goals: s.goals,
        on_loan: s.onLoan,
        source_ref: s.statement,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "source_ref" },
    );
    if (error) throw error;
  }
  // Spells Wikidata no longer gives for this club go (removed or corrected
  // there, or a women's team player from before the import left them out).
  const fresh = new Set(spells.map((s) => s.statement));
  // Paged, as big clubs hold more spells than one request returns.
  const held: { id: number; source_ref: string }[] = [];
  for (let from = 0; ; from += HELD_PAGE) {
    const { data, error } = await admin
      .from("player_spells")
      .select("id, source_ref")
      .eq("club_id", clubRow.id)
      .order("id")
      .range(from, from + HELD_PAGE - 1);
    if (error) throw error;
    held.push(...(data ?? []));
    if ((data ?? []).length < HELD_PAGE) break;
  }
  const stale = held.filter((h) => !fresh.has(h.source_ref)).map((h) => h.id);
  // A short answer from Wikidata must never empty a club: more than a quarter
  // going at once is left for a person to look at.
  if (stale.length > held.length / 4) throw new Error(`${stale.length} of ${held.length} spells would go. Check Wikidata before importing again.`);
  for (const batch of chunks(stale)) {
    const { error } = await admin.from("player_spells").delete().in("id", batch);
    if (error) throw error;
  }

  return { club: club.name, players: byPlayer.size, spells: spells.length, positions: positions.size, facts: facts.size, managers: extras?.managers.length ?? 0 };
}
