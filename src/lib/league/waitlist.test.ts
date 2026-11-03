import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { waitlistLeagueName } = await import("./waitlist");

describe("waitlistLeagueName", () => {
  it("tidies the name to the League's rules", () => {
    expect(waitlistLeagueName("  Lagos   Ballers ")).toBe("Lagos Ballers");
    expect(waitlistLeagueName("x".repeat(50))).toHaveLength(40);
  });
  it("gives up on a name too short to use", () => {
    expect(waitlistLeagueName("A")).toBeNull();
    expect(waitlistLeagueName("   ")).toBeNull();
    expect(waitlistLeagueName(null)).toBeNull();
  });
});

describe("waitlistLeaguesOpen", () => {
  const before = new Date("2026-11-03T12:00:00+01:00");
  it("waits for launch day, except for a beta tester", async () => {
    const { waitlistLeaguesOpen } = await import("./waitlist");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(waitlistLeaguesOpen(before)).toBe(false);
    expect(waitlistLeaguesOpen(before, true)).toBe(true);
    expect(waitlistLeaguesOpen(new Date("2026-11-20T00:00:00+01:00"))).toBe(true);
    vi.unstubAllEnvs();
  });
});
