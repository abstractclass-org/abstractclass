import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENGINE_NAME, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "./site.ts";

test("the site and its engine have their names", () => {
  assert.equal(SITE_NAME, "Drawing Board");
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
