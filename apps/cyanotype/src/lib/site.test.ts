import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

// The pages that a visitor opens: every route with a page, except /import, which only takes a game that a link carries,
// and the lab pages.
const routes = fileURLToPath(new URL("../routes", import.meta.url));
const pagePaths = (dir: string, path = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? pagePaths(join(dir, e.name), `${path}/${e.name}`)
      : e.name === "+page.svelte" ? [path || "/"] : []);

test("the sitemap lists each page that a visitor opens, at the live address", async () => {
  const { GET } = await import("../routes/sitemap.xml/+server.ts");
  const response = GET();
  assert.equal(response.headers.get("Content-Type"), "application/xml");
  const listed = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const opened = pagePaths(routes).filter(p => p !== "/import" && !p.startsWith("/lab/"));
  assert.deepEqual([...listed].sort(), opened.map(p => `${SITE_ORIGIN}${p}`).sort());
});
