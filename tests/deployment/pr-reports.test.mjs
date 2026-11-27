import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "portfolio reports "));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const artifacts = join(directory, "artifacts");
  const published = join(directory, "published");
  const playwright = join(artifacts, "playwright-report");
  const lighthouse = join(artifacts, ".lighthouseci", "reports");
  await mkdir(playwright, { recursive: true });
  await mkdir(lighthouse, { recursive: true });

  return {
    playwright,
    lighthouse,
    published,
    prepare: () =>
      execFileSync(process.execPath, [
        "scripts/prepare-pr-reports.mjs",
        artifacts,
        published,
      ]),
  };
}

test("stages the self-contained Playwright report and links to the representative Lighthouse HTML", async (t) => {
  const fixtureReports = await fixture(t);
  const playwrightHTML = "<title>Playwright Test Report</title>";
  const lighthouseHTML = "<title>Lighthouse Report</title>";
  await writeFile(
    join(fixtureReports.playwright, "index.html"),
    playwrightHTML,
  );
  await writeFile(
    join(fixtureReports.lighthouse, "chosen.report.html"),
    lighthouseHTML,
  );
  await writeFile(
    join(fixtureReports.lighthouse, "manifest.json"),
    JSON.stringify([
      {
        htmlPath: "/home/runner/other.report.html",
        url: "http://localhost:4322/privacy/index.html",
        isRepresentativeRun: false,
      },
      {
        htmlPath: "/home/runner/chosen.report.html",
        url: "http://localhost:4322/privacy/index.html",
        isRepresentativeRun: true,
      },
    ]),
  );

  fixtureReports.prepare();

  const playwrightIndex = join(
    fixtureReports.published,
    "playwright",
    "index.html",
  );
  assert.equal(await readFile(playwrightIndex, "utf8"), playwrightHTML);
  const lighthouse = join(fixtureReports.published, "lighthouse");
  assert.deepEqual((await readdir(lighthouse)).sort(), [
    "index.html",
    "report-1.html",
  ]);
  assert.match(
    await readFile(join(lighthouse, "index.html"), "utf8"),
    /href="\.\/report-1">\/privacy\/<\/a>/,
  );
  assert.equal(
    await readFile(join(lighthouse, "report-1.html"), "utf8"),
    lighthouseHTML,
  );
});

test("keeps attached Playwright reports in the GitHub artifact", async (t) => {
  const fixtureReports = await fixture(t);
  await writeFile(
    join(fixtureReports.playwright, "index.html"),
    "<title>Playwright Test Report</title>",
  );
  await mkdir(join(fixtureReports.playwright, "data"));

  fixtureReports.prepare();

  await assert.rejects(readdir(fixtureReports.published), { code: "ENOENT" });
});
