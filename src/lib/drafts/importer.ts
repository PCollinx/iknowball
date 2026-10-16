import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrackedClub } from "./clubs";
import { fetchClubPlayers, type Spell } from "./wikidata";

const BATCH = 500;

function chunks<T>(rows: T[]): T[][] {
  return Array.from({ length: Math.ceil(rows.length / BATCH) }, (_, i) => rows.slice(i * BATCH, (i + 1) * BATCH));
}

export type ImportResult = { club: string; players: number; spells: number } | { club: string; error: string };

/** Fetches one club's player histories from Wikidata and upserts them. */
export async function importClub(club: TrackedClub): Promise<ImportResult> {
  const admin = createAdminClient();
  let spells: Spell[];
  try {
    spells = await fetchClubPlayers(club.wikipedia);
  } finally {
    await admin.from("api_calls").insert({ source: "wikidata", endpoint: `club:${club.wikipedia}` });
  }
  if (!spells.length) return { club: club.name, error: "No players found. Check the Wikipedia title." };

  const { data: clubRow, error: clubError } = await admin
    .from("clubs")
    .upsert(
      { wikidata_qid: spells[0].clubQid, name: club.name, short_name: club.short },
      { onConflict: "wikidata_qid", ignoreDuplicates: false },
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
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "wikidata_qid" },
      )
      .select("id, wikidata_qid");
    if (error) throw error;
    for (const p of data ?? []) ids.set(p.wikidata_qid, p.id);
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
        source_ref: s.statement,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "source_ref" },
    );
    if (error) throw error;
  }
  return { club: club.name, players: byPlayer.size, spells: spells.length };
}
