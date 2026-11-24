import { expect, test } from "@playwright/test";

const expectedHeaders = {
  "content-security-policy":
    "default-src 'none'; base-uri 'none'; connect-src 'self' https://gateway.umami.is/api/send; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self'; script-src 'self' https://cloud.umami.is/script.js; style-src 'self'",
  "permissions-policy":
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

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
