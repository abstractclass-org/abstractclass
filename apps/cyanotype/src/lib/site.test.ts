import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { GET } from "../routes/sitemap.xml/+server.ts";
import { ENGINE_NAME, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "./site.ts";

test("the site and its engine have their names", () => {
  assert.equal(SITE_NAME, "Cyanotype");
  assert.equal(ENGINE_NAME, "Stamp Duty");
});

// The files that cannot import site.ts, and repeat a value of it.
const file = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the script before the page draws reads the theme's own key", () => {
  assert.ok(file("../app.html").includes(`localStorage.getItem("${THEME_KEY}")`));
});

test("robots.txt names the sitemap at the live address", () => {
  assert.ok(file("../../static/robots.txt").includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`));
});

// The path of each route with a page, under the folder `dir`.
const pagePaths = (dir: URL, path = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? pagePaths(new URL(`${e.name}/`, dir), `${path}/${e.name}`)
      : e.name === "+page.svelte" ? [path || "/"] : []);

test("the sitemap lists each page that a visitor opens, at the live address", async () => {
  const listed = [...(await GET().text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const opened = pagePaths(new URL("../routes/", import.meta.url))
    .filter(p => p !== "/import" && !p.startsWith("/lab/"));
  assert.deepEqual(listed.sort(), opened.map(p => `${SITE_ORIGIN}${p}`).sort());
});
