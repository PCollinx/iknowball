// The service worker (step 16). When a page can't load because you're
// offline, it shows the "Lost the signal" screen (/offline). Nothing else is
// cached and nothing is played offline: answers are checked on the server.
// It also blows the whistle (push notifications, Collins, 7 Nov 2026): shows
// each buzz and opens its screen when tapped. The build's commit is written into the script, so every
// deploy installs a fresh worker with that deploy's offline screen.

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

const WORKER = `
const CACHE = "ikb-offline-${VERSION}";
const OFFLINE = "/offline";

// The offline screen's HTML, its CSS, scripts and fonts (all hashed files
// under /_next/static, found in the HTML and the CSS).
async function saveOffline() {
  await caches.delete(CACHE);
  const cache = await caches.open(CACHE);
  const page = await fetch(OFFLINE, { cache: "reload" });
  if (!page.ok) return;
  const html = await page.clone().text();
  await cache.put(OFFLINE, page);
  const files = new Set(html.match(/\\/_next\\/static\\/[^"'\\s)\\\\]+/g) ?? []);
  for (const file of [...files].filter((f) => f.endsWith(".css"))) {
    const css = await (await fetch(file)).text();
    for (const font of css.match(/\\/_next\\/static\\/media\\/[^"'\\s)\\\\]+/g) ?? []) files.add(font);
  }
  await cache.addAll([...files]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(saveOffline().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ikb-offline-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        // The screen lives at its own address, so Try again knows where to go back to.
        if (url.pathname === OFFLINE) return (await caches.match(OFFLINE)) ?? Response.error();
        const to = new URL(OFFLINE, self.location.origin);
        to.searchParams.set("from", url.pathname + url.search);
        return Response.redirect(to.href, 302);
      }),
    );
    return;
  }

  // The offline screen's own files, only when the network can't fetch them.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) ?? Response.error()));
  }
});

// A buzz: { title, body, url, tag } from src/lib/push/send.ts. A new one with
// the same tag replaces the last (this morning's Daily by tonight's).
self.addEventListener("push", (event) => {
  let buzz = {};
  try {
    buzz = event.data ? event.data.json() : {};
  } catch {
    buzz = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(buzz.title || "iKnowBall", {
      body: buzz.body || "",
      tag: buzz.tag || undefined,
      icon: "/icons/192.png",
      badge: "/icons/badge.png",
      data: { url: buzz.url || "/" },
    }),
  );
});

// Tapping it: the app's open window goes there, or a new one opens.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const to = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      const same = list.find((c) => c.url === to);
      if (same) return same.focus();
      const open = list.find((c) => "navigate" in c);
      if (open) {
        const moved = await open.navigate(to).catch(() => null);
        if (moved) return moved.focus();
      }
      return self.clients.openWindow(to);
    }),
  );
});
`;

export function GET() {
  return new Response(WORKER, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // Browsers check for a new worker on every visit; never serve a stale one.
      "Cache-Control": "no-cache",
    },
  });
}
