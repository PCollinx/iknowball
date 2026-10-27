import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase session cookie fresh on every page request.
export async function proxy(request: NextRequest) {
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
  await supabase.auth.getClaims();
  return response;
}

// Server actions skip this: on Vercel the proxy is a hop of its own, measured
// at about half a second from Nigeria (27 Oct 2026), paid on every answer. An
// action refreshes the session itself if it has to (it can set cookies), so
// skipping it is safe. Page requests still go through, prefetches included:
// a page can't save cookies, so a refresh there would lose the new token.
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|api/health|api/jobs|ingest|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
