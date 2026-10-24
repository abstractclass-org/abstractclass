import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENGINE_NAME, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "./site.ts";

test("the site and its engine have their names", () => {
  assert.equal(SITE_NAME, "Drawing Board");
  assert.equal(ENGINE_NAME, "Stamp Duty");
  assert.equal(SITE_ORIGIN, "https://drawingboard.abstractclass.org");
});

test("the script before the page draws reads the theme's own key", () => {
  assert.match(THEME_KEY, /^drawing-board:/);
  const html = readFileSync(new URL("../app.html", import.meta.url), "utf8");
  assert.ok(html.includes(`localStorage.getItem("${THEME_KEY}")`));
});
