/*
 * Shows the saved offline page when a page cannot load. It never answers with a
 * cached copy of a live page, so deploys and rollbacks reach visitors as usual.
 * The build replaces the version below whenever the offline page changes.
 */
const cacheName = "offline-__OFFLINE_VERSION__";
const offlineUrl = "/offline/";

const saveOfflinePage = async () => {
  const cache = await caches.open(cacheName);
  const page = await fetch(offlineUrl);
  const html = await page.clone().text();
  const assets = [...html.matchAll(/\/_astro\/[^"']+\.(?:css|js)/g)].map(
    ([url]) => url,
  );
  const styles = await Promise.all(
    assets
      .filter((url) => url.endsWith(".css"))
      .map((url) => fetch(url).then((response) => response.text())),
  );
  const fonts = styles.flatMap((css) =>
    [...css.matchAll(/\/_astro\/[^)"']+\.woff2/g)].map(([url]) => url),
  );

  await cache.addAll([...new Set([...assets, ...fonts])]);
  await cache.put(offlineUrl, page);
};

const removeOldVersions = async () => {
  const names = await caches.keys();

  await Promise.all(
    names
      .filter((name) => name !== cacheName)
      .map((name) => caches.delete(name)),
  );
  await clients.claim();
};

const fallBackTo = async (request, match) => {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(match)) ?? Response.error();
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(saveOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(removeOldVersions());
});

self.addEventListener("fetch", (event) => {
  const { method, mode, url } = event.request;
  const { origin, pathname } = new URL(url);

  if (method !== "GET" || origin !== location.origin) return;

  if (mode === "navigate") {
    event.respondWith(fallBackTo(event.request, offlineUrl));
  } else if (pathname.startsWith("/_astro/")) {
    event.respondWith(fallBackTo(event.request, event.request));
  }
});
