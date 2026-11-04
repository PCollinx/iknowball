import { connection } from "next/server";
import { currentEmail } from "@/lib/daily/data";
import { launchHtml } from "@/lib/launch/email";
import { sampleLaunchEmail } from "@/lib/launch/send";
import { requireAdmin } from "@/lib/maker/data";

// The launch email as it will look, for the admin looking: their own waitlist
// row if they're on it, else the first row. Admins only: it shows a row's details.
export async function GET() {
  await connection();
  await requireAdmin();
  const e = await sampleLaunchEmail((await currentEmail()) ?? "");
  return new Response(launchHtml(e), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
