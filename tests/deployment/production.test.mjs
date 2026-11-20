import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);
const homepage = "<!doctype html><title>Portfolio</title><main>Current</main>";

async function fixture(t, respond) {
  const directory = await mkdtemp(join(tmpdir(), "portfolio smoke "));
  const expected = join(directory, "verified homepage.html");
  await writeFile(expected, homepage);
  t.after(() => rm(directory, { recursive: true, force: true }));

  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
    respond(request, response, requests);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return {
    expected,
    requests: () => requests,
    run: (file = expected) =>
      execute(
        "bash",
        [
          "scripts/verify-production.sh",
          `http://127.0.0.1:${address.port}/`,
          file,
        ],
        {
          env: {
            ...process.env,
            PRODUCTION_SMOKE_ATTEMPTS: "3",
            PRODUCTION_SMOKE_DELAY_SECONDS: "0",
          },
          timeout: 10_000,
        },
      ),
  };
}

test("production verification accepts the exact artifact after a redirect", async (t) => {
  const site = await fixture(t, (request, response) => {
    if (request.url === "/") {
      response.writeHead(302, { Location: "/home/" });
      response.end();
    } else {
      response.end(homepage);
    }
  });

  const result = await site.run();
  assert.match(result.stdout, /serves the verified homepage \(attempt 1\/3\)/);
  assert.equal(site.requests(), 2);
});

test("production verification retries HTTP errors and stale successful responses", async (t) => {
  const site = await fixture(t, (_request, response, requests) => {
    if (requests === 1) {
      response.writeHead(503);
      response.end("Unavailable");
    } else if (requests === 2) {
      response.end(homepage.replace("Current", "Previous"));
    } else {
      response.end(homepage);
    }
  });

  const result = await site.run();
  assert.match(result.stdout, /serves the verified homepage \(attempt 3\/3\)/);
  assert.match(result.stderr, /attempt 1\/3, HTTP 503/);
  assert.match(result.stderr, /attempt 2\/3, HTTP 200/);
  assert.equal(site.requests(), 3);
});

test("production verification rejects different content with the same title after its retry limit", async (t) => {
  const site = await fixture(t, (_request, response) => {
    response.end(homepage.replace("Current", "Previous"));
  });

  await assert.rejects(site.run(), (error) => {
    assert.equal(error.code, 1);
    assert.match(
      error.stderr,
      /did not serve the verified homepage after 3 attempts/,
    );
    return true;
  });
  assert.equal(site.requests(), 3);
});

test("production verification rejects an empty successful response", async (t) => {
  const site = await fixture(t, (_request, response) => response.end());

  await assert.rejects(site.run(), { code: 1 });
  assert.equal(site.requests(), 3);
});

test("production verification rejects a missing artifact before making requests", async (t) => {
  const site = await fixture(t, (_request, response) => response.end(homepage));

  await assert.rejects(site.run(`${site.expected}.missing`), { code: 1 });
  assert.equal(site.requests(), 0);
});
