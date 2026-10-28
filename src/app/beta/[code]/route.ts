import { NextResponse, type NextRequest } from "next/server";
import { BETA_COOKIE, betaPass } from "@/lib/waitlist";

// The beta invite link: /beta/{BETA_CODE}. The right code leaves a cookie that
// lets this browser past the waitlist to the games (src/proxy.ts); a wrong one
// just lands on the waitlist. Either way you end up on the front page.

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const response = NextResponse.redirect(new URL("/", request.url));
  if (betaPass(code, process.env.BETA_CODE)) {
    response.cookies.set(BETA_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }
  return response;
}
