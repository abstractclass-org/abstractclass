// Checks that the collie's files draw the site's head (design 12): the favicon, and the copy that partner sites take for
// their buttons (static/brand/hedge-school.svg, design 18). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HEAD_COAT, HEAD_SILHOUETTE, HEAD_VIEWBOX } from "./collie.ts";

const drawing = (file: string) => {
  const svg = readFileSync(file, "utf8");
  return { viewBox: /viewBox="([^"]+)"/.exec(svg)?.[1], paths: [...svg.matchAll(/<path fill="([^"]+)"[^>]* d="([^"]+)"/g)].map(m => [m[1], m[2]]) };
};
const head = { viewBox: HEAD_VIEWBOX, paths: [["#ffffff", HEAD_SILHOUETTE], ["#0b0c0e", HEAD_COAT]] };

test("the favicon and the partners' copy draw the site's head", () => {
  assert.deepEqual(drawing("src/lib/assets/favicon.svg"), head);
  assert.deepEqual(drawing("static/brand/hedge-school.svg"), head);
});
