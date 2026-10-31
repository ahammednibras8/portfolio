import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const envFile = new URL(".env", import.meta.url);

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const site = process.env.SITE_URL;

if (!site) {
  throw new Error(
    "SITE_URL must be set to the portfolio's canonical HTTPS URL.",
  );
}

if (!URL.canParse(site)) {
  throw new Error("SITE_URL must be a valid HTTPS origin.");
}

const siteUrl = new URL(site);

if (
  siteUrl.protocol !== "https:" ||
  siteUrl.username ||
  siteUrl.password ||
  siteUrl.pathname !== "/" ||
  siteUrl.search ||
  siteUrl.hash
) {
  throw new Error(
    "SITE_URL must be an HTTPS origin without credentials, a path, a query, or a fragment.",
  );
}

// A service worker only reinstalls when its bytes change, so tie it to the page.
const stampServiceWorker = {
  name: "stamp-service-worker",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const page = await readFile(new URL("offline/index.html", dir));
      const version = createHash("sha256")
        .update(page)
        .digest("hex")
        .slice(0, 12);
      const worker = new URL("sw.js", dir);
      const source = await readFile(worker, "utf8");

      await writeFile(worker, source.replace("__OFFLINE_VERSION__", version));
    },
  },
};

export default defineConfig({
  output: "static",
  site: siteUrl.href,
  image: {
    // Matches the sharpness of the default WebP at fewer bytes.
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: { avif: { quality: 65 } },
    },
  },
  integrations: [
    sitemap({ filter: (page) => !page.endsWith("/offline/") }),
    stampServiceWorker,
  ],
  vite: {
    build: {
      // The security policy blocks inline scripts, so every script must be a file.
      assetsInlineLimit: 0,
      // Rewrites newer CSS syntax so older tablets still get the wide layouts.
      cssTarget: ["chrome100", "firefox100", "safari15"],
    },
  },
});
