import { describe, expect, it } from "vitest";
import { launchHtml, launchPreview, launchSubject, launchText, type LaunchEmail } from "./email";
import { readWaitlistToken, waitlistToken } from "./token";

const base: LaunchEmail = {
  name: "collinsCFC",
  position: 37,
  fixture: "Chelsea v Man City",
  league: { name: "Lekki Ballers", made: false },
  site: "https://playiknowball.com",
  heroUrl: "https://playiknowball.com/email/hero/37-x",
  unsubscribeUrl: "https://playiknowball.com/unsubscribe/37-x",
  replyTo: "privacy@playiknowball.com",
};

describe("launch email", () => {
  it("names them in the subject when they gave a name", () => {
    expect(launchSubject(base)).toBe("The gates are open, collinsCFC. Your shirt's ready.");
    expect(launchSubject({ name: null })).toBe("The gates are open. Your shirt's ready.");
  });

  it("tells them to sign in with this email for a league still to start", () => {
    expect(launchPreview(base)).toContain("Lekki Ballers kicks off when you sign in");
    expect(launchHtml(base)).toContain("sign in with this email");
    expect(launchText(base)).toContain("sign in with this email");
  });

  it("says a beta tester's league is already up", () => {
    const made = { ...base, league: { name: "Lekki Ballers", made: true } };
    expect(launchHtml(made)).toContain("It's already up");
    expect(launchPreview(made)).not.toContain("Lekki Ballers");
  });

  it("leaves the league out when they named none", () => {
    const none = { ...base, league: null };
    expect(launchHtml(none)).not.toContain("Your league");
    expect(launchText(none)).not.toContain("Your league");
  });

  it("escapes what people typed", () => {
    const html = launchHtml({ ...base, name: "<b>x</b>", league: { name: "A & B", made: false } });
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("A &amp; B");
  });

  it("carries the number, today's Daily and the unsubscribe link", () => {
    const html = launchHtml(base);
    expect(html).toContain("No. 37");
    expect(html).toContain("Chelsea v Man City");
    expect(html).toContain(base.unsubscribeUrl);
    expect(launchHtml({ ...base, fixture: null })).toContain("Today's Daily is live");
  });
});

describe("waitlist tokens", () => {
  it("reads back its own id and refuses anything else", () => {
    const t = waitlistToken(37, "a-secret-of-sixteen+");
    expect(readWaitlistToken(t, "a-secret-of-sixteen+")).toBe(37);
    expect(readWaitlistToken(t, "another-secret-here")).toBeNull();
    expect(readWaitlistToken(t.replace(/^37/, "38"), "a-secret-of-sixteen+")).toBeNull();
    expect(readWaitlistToken("37", "a-secret-of-sixteen+")).toBeNull();
  });
});
