import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { BETA_COOKIE, PLAYED_COOKIE, betaPass, gated, waitlistUp } from "@/lib/waitlist";

// Keeps the Supabase session cookie fresh on every page request. While the
// waitlist is up (src/lib/waitlist.ts), the live site shows it in place of the
// games, except to browsers holding the beta invite's cookie. Test sites never
// switch: there the waitlist is at /waitlist. Home is the welcome for new
// players; one who has played a Daily goes from / straight to /daily
// (Collins, 11 Nov 2026), remembered by a cookie so the database is asked
// once. The navbar's 00 Home opens the welcome at /welcome for everyone.
export async function proxy(request: NextRequest) {
  if (
    process.env.VERCEL_ENV === "production" &&
    waitlistUp() &&
    gated(request.nextUrl.pathname) &&
    !betaPass(request.cookies.get(BETA_COOKIE)?.value, process.env.BETA_CODE)
  ) {
    return NextResponse.rewrite(new URL("/waitlist", request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Verifies the token locally (refreshing it when it has expired) rather than
  // asking Supabase on every request.
  const { data } = await supabase.auth.getClaims();
  if (request.nextUrl.pathname === "/") {
    if (request.cookies.has(PLAYED_COOKIE)) return toDaily(request, response);
    const me = data?.claims.sub;
    if (me) {
      // Row-level security lets a player read only their own attempts.
      const { data: played } = await supabase.from("attempts").select("id").eq("user_id", me).limit(1);
      if (played?.length) return toDaily(request, response, true);
    }
  }
  return response;
}

/** Off to the Daily, keeping any session cookies the refresh just set. */
function toDaily(request: NextRequest, response: NextResponse, remember = false) {
  const redirect = NextResponse.redirect(new URL("/daily", request.url));
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  if (remember) redirect.cookies.set(PLAYED_COOKIE, "1", { maxAge: 60 * 60 * 24 * 400, path: "/", sameSite: "lax", secure: request.nextUrl.protocol === "https:" });
  return redirect;
}

// Server actions skip this: on Vercel the proxy is a hop of its own, measured
// at about half a second from Nigeria (27 Oct 2026), paid on every answer. An
// action refreshes the session itself if it has to (it can set cookies), so
// skipping it is safe. Page requests still go through, prefetches included:
// a page can't save cookies, so a refresh there would lose the new token.
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|api/health|api/jobs|ingest|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
