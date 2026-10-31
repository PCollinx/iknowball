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
