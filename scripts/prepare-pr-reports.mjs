import {
  existsSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const [artifacts, output] = process.argv.slice(2);
const playwright = join(artifacts, "playwright-report");
const playwrightIndex = join(playwright, "index.html");
if (existsSync(playwrightIndex) && !existsSync(join(playwright, "data"))) {
  mkdirSync(join(output, "playwright"), { recursive: true });
  copyFileSync(playwrightIndex, join(output, "playwright", "index.html"));
}

const lighthouse = join(artifacts, ".lighthouseci", "reports");
const manifest = join(lighthouse, "manifest.json");
if (existsSync(manifest)) {
  const reports = JSON.parse(readFileSync(manifest, "utf8"))
    .filter((report) => report.isRepresentativeRun)
    .map(({ htmlPath, url }) => ({
      file: basename(htmlPath),
      route: new URL(url).pathname.replace(/\/index\.html$/, "/"),
    }))
    .sort((first, second) => first.route.localeCompare(second.route));

  if (reports.length) {
    const directory = join(output, "lighthouse");
    mkdirSync(directory, { recursive: true });
    const links = reports.map(({ file, route }, index) => {
      if (!file.endsWith(".report.html")) {
        throw new Error(`Unexpected Lighthouse report filename: ${file}`);
      }
      const name = `report-${index + 1}`;
      copyFileSync(join(lighthouse, file), join(directory, `${name}.html`));
      const label = route
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      return `<li><a href="./${name}">${label}</a></li>`;
    });

    writeFileSync(
      join(directory, "index.html"),
      `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lighthouse reports</title></head>
<body><main><h1>Lighthouse reports</h1><ul>${links.join("\n")}</ul></main></body>
</html>\n`,
    );
  }
}
