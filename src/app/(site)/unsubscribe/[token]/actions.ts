"use server";

import { unsubscribe } from "@/lib/launch/unsubscribe";

export type UnsubscribeState = { done: boolean; error?: string } | null;

export async function unsubscribeAction(_prev: UnsubscribeState, formData: FormData): Promise<UnsubscribeState> {
  const ok = await unsubscribe(String(formData.get("token") ?? ""));
  return ok ? { done: true } : { done: false, error: "That link doesn't work. Email us and we'll take you off." };
}
