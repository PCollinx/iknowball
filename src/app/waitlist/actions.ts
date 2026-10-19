"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// The waitlist before launch (opens Nov 1, 2026). Written with the service
// role; the table has no client read policy, so nobody can list the emails.

export type WaitlistState =
  | { error: string }
  | { ok: true; position: number; name: string; clubId: number | null; again: boolean }
  | null;

const UNIQUE_VIOLATION = "23505";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

const schema = z.object({
  email: z.email("That email doesn't look right.").trim().toLowerCase().max(254),
  name: optional(30),
  club: z.union([z.literal("").transform(() => null), z.coerce.number().int().positive()]),
  league: optional(40),
  mates: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(0).max(100)]),
});

/** Your number in the queue: how many signed up before you, plus you. */
async function positionOf(id: number): Promise<number> {
  const { count } = await createAdminClient().from("waitlist").select("id", { count: "exact", head: true }).lte("id", id);
  return count ?? 1;
}

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  // A field people never see: bots fill it in, people don't.
  if (formData.get("website")) return { error: "Couldn't sign you up. Try again." };
  const parsed = schema.safeParse({
    email: formData.get("email") ?? "",
    name: formData.get("name") ?? "",
    club: formData.get("club") ?? "",
    league: formData.get("league") ?? "",
    mates: formData.get("mates") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { email, name, club, league, mates } = parsed.data;

  const admin = createAdminClient();
  const clubName = club ? ((await admin.from("clubs").select("name").eq("id", club).eq("fan_pick", true).maybeSingle()).data?.name ?? null) : null;
  const { data, error } = await admin
    .from("waitlist")
    .insert({ email, name, favourite_club: clubName, league_name: league, mates_count: league ? mates : null })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    const { data: row } = await admin.from("waitlist").select("id").eq("email", email).single();
    return { ok: true, position: row ? await positionOf(row.id) : 1, name: name ?? "", clubId: clubName ? club : null, again: true };
  }
  if (error || !data) {
    console.error("joinWaitlist", error);
    return { error: "Couldn't sign you up. Try again." };
  }
  return { ok: true, position: await positionOf(data.id), name: name ?? "", clubId: clubName ? club : null, again: false };
}
