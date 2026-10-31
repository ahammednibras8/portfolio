import { expect, test } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const built = async (folder: string, extension: string) => {
  const names = (await readdir(resolve(folder))).filter((name) =>
    name.endsWith(extension),
  );

  return Promise.all(
    names.map((name) => readFile(resolve(folder, name), "utf8")),
  );
};

test("shipped scripts avoid APIs that older browsers lack", async () => {
  const sources = [
    ...(await built("dist/_astro", ".js")),
    await readFile(resolve("dist/sw.js"), "utf8"),
  ];
  const newer =
    /\.(?:findLast|findLastIndex|toSorted|toReversed|replaceAll|hasOwn|at)\(|structuredClone\(/;

  expect(sources.length).toBeGreaterThan(0);

  for (const source of sources) {
    expect(source.match(newer)?.[0]).toBeUndefined();
  }
});

test("clipping has a fallback for browsers without overflow clip", async () => {
  const styles = (await built("dist/_astro", ".css")).join("");

  expect(styles).toMatch(/@supports not \(overflow:\s*clip\)/);
});
