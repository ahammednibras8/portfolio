import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const expectedHeaders = {
  "content-security-policy":
    "default-src 'none'; base-uri 'none'; connect-src 'none'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self'; script-src 'none'; style-src 'self'",
  "permissions-policy":
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

test("the build includes the Cloudflare Pages header rules", async () => {
  const headersArtifact = await readFile(resolve("dist/_headers"), "utf8");

  expect(headersArtifact).toBe(`/*
  Content-Security-Policy: ${expectedHeaders["content-security-policy"]}
  X-Frame-Options: ${expectedHeaders["x-frame-options"]}
  X-Content-Type-Options: ${expectedHeaders["x-content-type-options"]}
  Referrer-Policy: ${expectedHeaders["referrer-policy"]}
  Permissions-Policy: ${expectedHeaders["permissions-policy"]}
`);
});

test("Cloudflare Pages applies the security headers to HTML responses", async ({
  request,
}) => {
  const home = await request.get("/");
  const notFound = await request.get("/route-that-does-not-exist");

  expect(home.status()).toBe(200);
  expect(notFound.status()).toBe(404);

  for (const [name, value] of Object.entries(expectedHeaders)) {
    expect(home.headers()[name]).toBe(value);
    expect(notFound.headers()[name]).toBe(value);
  }
});
