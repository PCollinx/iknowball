import { describe, expect, it } from "vitest";
import { inAppBrowser, installWay, isIos, ticketDue } from "./platform";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const X_IPHONE = `${IPHONE} Twitter for iPhone/11.20`;

describe("installWay", () => {
  it("says installed when opened from the home screen", () => {
    expect(installWay({ ua: ANDROID, touchPoints: 5, standalone: true, prompt: true })).toBe("installed");
  });

  it("uses the browser's own install when it offers one", () => {
    expect(installWay({ ua: ANDROID, touchPoints: 5, standalone: false, prompt: true })).toBe("prompt");
  });

  it("shows the Share steps on iPhone and iPad", () => {
    expect(installWay({ ua: IPHONE, touchPoints: 5, standalone: false, prompt: false })).toBe("ios");
    expect(installWay({ ua: IPAD, touchPoints: 5, standalone: false, prompt: false })).toBe("ios");
  });

  it("offers nothing on a Mac or a browser that can't install", () => {
    expect(installWay({ ua: IPAD, touchPoints: 0, standalone: false, prompt: false })).toBe("none");
    expect(installWay({ ua: ANDROID, touchPoints: 5, standalone: false, prompt: false })).toBe("none");
  });
});

describe("isIos and inAppBrowser", () => {
  it("tells an iPad from a Mac by its touch screen", () => {
    expect(isIos(IPAD, 5)).toBe(true);
    expect(isIos(IPAD, 0)).toBe(false);
  });

  it("spots X's and WhatsApp's own browsers", () => {
    expect(inAppBrowser(X_IPHONE)).toBe(true);
    expect(inAppBrowser(`${ANDROID} WhatsApp/2.24`)).toBe(true);
    expect(inAppBrowser(IPHONE)).toBe(false);
  });
});

describe("ticketDue", () => {
  const day = 86_400_000;
  it("shows the ticket until Not now, then again after 14 days", () => {
    expect(ticketDue(null, 0)).toBe(true);
    expect(ticketDue(0, 13 * day)).toBe(false);
    expect(ticketDue(0, 14 * day)).toBe(true);
  });
});
