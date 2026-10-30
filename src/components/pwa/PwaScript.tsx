// Runs as the HTML arrives, before React: keeps the browser's install offer
// for useInstall (Chrome may fire it before the page hydrates), and, in
// production builds, registers the service worker (src/app/sw.js) once the
// page has loaded, so it never competes with the first load.

const CATCH = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__ikbPrompt=e;dispatchEvent(new Event("ikb-install"))});addEventListener("appinstalled",function(){window.__ikbPrompt=null;window.__ikbInstalled=true;dispatchEvent(new Event("ikb-install"))});`;
const REGISTER = `if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});`;

export function PwaScript() {
  const code = process.env.NODE_ENV === "production" ? CATCH + REGISTER : CATCH;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
