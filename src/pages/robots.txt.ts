import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("The canonical site URL is required to build robots.txt.");
  }

  const sitemap = new URL("sitemap-index.xml", site);
  const body = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${sitemap.href}`,
    "",
  ].join("\n");

  return new Response(body);
};
