import { test } from "node:test";
import assert from "node:assert/strict";
import { card } from "./card.ts";
import { drawing, LARGE_FROM, LOGO_OPTIONS, nest, svg } from "./logoOptions.ts";

const viewBox = (doc: string) => /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="([^"]+)">/.exec(doc)?.[1];
const square = (doc: string) => { const [, , w, h] = (viewBox(doc) ?? "").split(" ").map(Number); return w > 0 && w === h; };

test("each option has every form, each a square SVG document, and a mascot has its brief", () => {
  assert.equal(new Set(LOGO_OPTIONS.map(o => o.id)).size, LOGO_OPTIONS.length);
  for (const o of LOGO_OPTIONS) {
    for (const doc of [o.large.light, o.large.dark, o.small.light, o.small.dark, o.favicon, o.touch]) {
      assert.ok(square(doc), `${o.id}: ${doc.slice(0, 80)}`);
      assert.ok(doc.endsWith("</svg>"));
      assert.doesNotMatch(doc, /NaN|undefined/);
    }
  }
  assert.ok(LOGO_OPTIONS.find(o => o.id === "bee")?.brief);
});

test("the iOS icon fills its square: its first shape is a square of the whole view, with square corners", () => {
  for (const o of LOGO_OPTIONS) assert.match(o.touch, /viewBox="0 0 100 100"><rect width="100" height="100"( rx="0")? fill="#/, o.id);
});

test("the simple drawing serves below 48 pixels, the full one from there", () => {
  const o = LOGO_OPTIONS[0];
  assert.equal(drawing(o, LARGE_FROM - 1, "light"), o.small.light);
  assert.equal(drawing(o, LARGE_FROM, "dark"), o.large.dark);
});

test("a drawing nests in another at a place and a size, and keeps its own view", () => {
  assert.equal(nest(svg("<g/>", "-4 -4 108 108"), 10, 12, 76),
               '<svg x="10" y="12" width="76" height="76" viewBox="-4 -4 108 108"><g/></svg>');
});

test("the link preview picture is Open Graph's size and names the site, its game and its address", () => {
  const doc = card(LOGO_OPTIONS[0]);
  assert.equal(viewBox(doc), "0 0 1200 630");
  for (const words of ["Cyanotype", "Learn Blueprints", "cyanotype.abstractclass.org"]) assert.ok(doc.includes(words));
});
