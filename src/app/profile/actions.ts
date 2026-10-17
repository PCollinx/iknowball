"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "@/lib/daily/data";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Profile writes go through the player's own session, so row-level security
// applies and the database trigger enforces the once-a-season club switch.

export type FormState = { error: string } | { ok: string } | null;

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

/** Answers "Who do you support?": a club, neutral, or skip (asked only once). */
export async function chooseClub(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: "Play a Daily first, then pick your club." };
  const supabase = await createClient();
  const now = new Date().toISOString();

  if (formData.get("intent") === "skip") {
    await supabase.from("profiles").update({ club_asked_at: now }).eq("id", user.id);
    refresh();
    return null;
  }

  const choice = z.union([z.literal("neutral"), z.coerce.number().int().positive()]).safeParse(formData.get("club"));
  if (!choice.success) return { error: "Pick a club, or go neutral." };
  const { error } = await supabase
    .from("profiles")
    .update({ favourite_club_id: choice.data === "neutral" ? null : choice.data, club_asked_at: now })
    .eq("id", user.id);
  if (error) return { error: error.code === CHECK_VIOLATION ? error.message : "Couldn't save your club. Try again." };
  refresh();
  return { ok: "Saved." };
}

const username = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,20}$/, "3 to 20 letters, numbers or underscores.");

/** The name across the back of your shirt, and on the tables. */
export async function setUsername(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: "Play a Daily first, then name your shirt." };
  const parsed = username.safeParse(formData.get("username"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await (await createClient()).from("profiles").update({ username: parsed.data }).eq("id", user.id);
  if (error) return { error: error.code === UNIQUE_VIOLATION ? "That name's taken. Try another." : "Couldn't save your name. Try again." };
  refresh();
  return { ok: "Saved." };
}

function callbackUrl() {
  return `${publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/auth/callback?next=/profile`;
}

const email = z.email("Enter a real email address.");

/** Keeps a guest's account (same id, so every Daily stays) by adding an email.
 * With no guest session, sends a sign-in link instead. */
export async function saveWithEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await currentUser();
  const supabase = await createClient();

  if (user?.is_anonymous) {
    const { error } = await supabase.auth.updateUser({ email: parsed.data }, { emailRedirectTo: callbackUrl() });
    if (error?.code === "email_exists") return { error: "That email already has an account. Sign in with it instead." };
    if (error) return { error: "Couldn't send the link. Try again in a minute." };
    return { ok: `Link sent to ${parsed.data}. Open it on this device to save your account.` };
  }
  return sendSignInLink(parsed.data);
}

/** Signs in to an existing account by email link. */
export async function signInWithEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return sendSignInLink(parsed.data);
}

async function sendSignInLink(address: string): Promise<FormState> {
  const { error } = await (await createClient()).auth.signInWithOtp({
    email: address,
    options: { emailRedirectTo: callbackUrl() },
  });
  if (error) return { error: "Couldn't send the link. Try again in a minute." };
  return { ok: `Sign-in link sent to ${address}. Open it on this device.` };
}

/** Google: linked to the guest account if there is one, else a normal sign-in. */
export async function continueWithGoogle() {
  const user = await currentUser();
  const supabase = await createClient();
  const options = { redirectTo: callbackUrl() };
  const { data, error } = user?.is_anonymous
    ? await supabase.auth.linkIdentity({ provider: "google", options })
    : await supabase.auth.signInWithOAuth({ provider: "google", options });
  if (error || !data.url) redirect("/profile?auth_error=google");
  redirect(data.url);
}

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect("/profile");
}
