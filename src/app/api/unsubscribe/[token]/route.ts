import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/launch/unsubscribe";

// One-click unsubscribe (RFC 8058): mail apps POST here from the
// List-Unsubscribe header the launch email carries.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const ok = await unsubscribe((await params).token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
