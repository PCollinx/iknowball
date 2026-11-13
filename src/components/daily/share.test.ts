import { describe, expect, it } from "vitest";
import { cardQuestion, fixtureSize, scoredBy, shareMessage } from "./share";

describe("cardQuestion", () => {
  it("keeps Free Recall's prompt as it is", () => {
    const prompt = "Name the 8 players who've played for both Man United and Norwich since 1992.";
    expect(cardQuestion({ format: "free_recall", prompt, answer_count: 8 })).toBe(prompt);
  });

  it("drops the how-to-play tail and puts the count first", () => {
    expect(cardQuestion({ format: "era", prompt: "When were they at Arsenal? Tap the right years.", answer_count: 5 })).toBe(
      "5 players: when were they at Arsenal?",
    );
    expect(cardQuestion({ format: "in_order", prompt: "They all played for Chelsea. Who joined first? Earliest at the top.", answer_count: 8 })).toBe(
      "8 to put in order: they all played for Chelsea. Who joined first?",
    );
  });

  it("keeps a one-sentence prompt even when it starts with Tap", () => {
    expect(cardQuestion({ format: "pick", prompt: "Tap the player who's played for both Chelsea and Arsenal since 1992.", answer_count: 10 })).toBe(
      "10 to pick: tap the player who's played for both Chelsea and Arsenal since 1992.",
    );
  });
});

describe("the card's words", () => {
  it("says who scored, or I", () => {
    expect(scoredBy("collinsCFC")).toBe("collinsCFC scored");
    expect(scoredBy(null)).toBe("I scored");
  });

  it("keeps a long fixture on one line", () => {
    expect(fixtureSize("Man United v Norwich")).toBe(6.4);
    expect(fixtureSize("Nott'm Forest v Brighton & Hove Albion") * 0.55 * 38).toBeLessThanOrEqual(88.01);
  });

  it("writes the message with the dare and the link", () => {
    expect(shareMessage({ fixture: "Man United v Norwich", points: 40 }, "https://playiknowball.com/")).toBe(
      "I got 40/100 on today's iKnowBall: Man United v Norwich.\nCan you beat 40?\nhttps://playiknowball.com/daily",
    );
  });
});
