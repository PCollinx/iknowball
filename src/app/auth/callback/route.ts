import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where email links and Google send players back. Finishes the sign-in (or the
// guest-to-account upgrade) by setting the session cookie, then goes on.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const nextParam = url.searchParams.get("next") ?? "/profile";
  // Only paths on this site, so the link can't bounce players elsewhere.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/profile";
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let failed = Boolean(url.searchParams.get("error"));
  if (!failed && code) {
    failed = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  } else if (!failed && tokenHash && type) {
    failed = Boolean((await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error);
  } else if (!failed) {
    failed = true;
  }

  // A Google account that already belongs to another player can't be linked.
  const reason = url.searchParams.get("error_code") === "identity_already_exists" ? "taken" : "link";
  const to = new URL(failed ? `/profile?auth_error=${reason}` : next, url.origin);
  return NextResponse.redirect(to);
}
