import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isTestSite } from "@/lib/daily/sample";
import { CrashPreview } from "./CrashPreview";

// Test sites only: the last-resort screen as it looks when the whole app fails
// (no navbar or footer). A real root-layout failure can't be faked safely, so
// this draws the same screen. Remove once Collins has tested it.
export default async function Crash() {
  await connection();
  if (!isTestSite()) notFound();
  return (
    <div className="flex min-h-dvh flex-col">
      <CrashPreview />
    </div>
  );
}
