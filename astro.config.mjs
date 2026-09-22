import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { existsSync } from "node:fs";

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

export default defineConfig({
  output: "static",
  site: siteUrl.href,
  integrations: [sitemap()],
});
