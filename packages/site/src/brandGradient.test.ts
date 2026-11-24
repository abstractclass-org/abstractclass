// The drawings whose shapes a gradient fills (brandGradient.ts): a drawing without one is drawn as brand.ts draws it,
// and each gradient has an id of its own in each place that shows it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shapeMarkup, svgDocument, type Shape } from "./brand.ts";
import { drawingDocument, drawingMarkup, type Drawing } from "./brandGradient.ts";

const PLAIN: readonly Shape[] = [
  ["rect", { width: 100, height: 100, rx: 18, fill: "#123456" }],
  ["path", { d: "M0,0L1,1Z", opacity: 0.5 }],
];
const FADE: Drawing = [
  ["rect", { width: 100, height: 100, fill: "#123456" }],
  ["rect", { x: 1, y: 2, width: 3, height: 4, rx: 2 },
    { stops: [[0, "#aabbcc"], [0.18, "#aabbcc"], [1, "#aabbcc", 0]] }],
];
const ids = (svg: string) => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const references = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);

test("a drawing without a gradient is drawn as brand.ts draws it, with no id", () => {
  assert.equal(drawingMarkup(PLAIN, "logo"), shapeMarkup(PLAIN));
  assert.equal(drawingMarkup(PLAIN, "logo", "\n  "), shapeMarkup(PLAIN, "\n  "));
  assert.equal(drawingDocument(PLAIN, 32, "logo", "A note."), svgDocument(PLAIN, 32, "A note."));
  assert.deepEqual(ids(drawingDocument(PLAIN, 32, "logo")), []);
});

test("a gradient runs from the shape's left to its right through its stops, and the shape fills with it", () => {
  assert.equal(drawingMarkup(FADE, "logo"),
    '<rect width="100" height="100" fill="#123456"/>'
    + '<defs><linearGradient id="logo-1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#aabbcc"/>'
    + '<stop offset="0.18" stop-color="#aabbcc"/><stop offset="1" stop-color="#aabbcc" stop-opacity="0"/>'
    + '</linearGradient></defs><rect x="1" y="2" width="3" height="4" rx="2" fill="url(#logo-1)"/>');
});

test("two instances in one page share no id, and each refers to its own gradient", () => {
  const [header, about] = [drawingMarkup(FADE, "s1"), drawingMarkup(FADE, "s2")];
  assert.deepEqual(ids(header).filter(id => ids(about).includes(id)), []);
  for (const svg of [header, about]) assert.deepEqual(references(svg), ids(svg));
});

test("two gradients of one drawing have two ids", () => {
  const svg = drawingMarkup([...FADE, FADE[1]], "logo");
  assert.equal(new Set(ids(svg)).size, 2);
  assert.deepEqual(references(svg), ids(svg));
});

test("a document with a gradient defines each id that it refers to", () => {
  const doc = drawingDocument(FADE, 180, "touch", "A note.");
  assert.ok(doc.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="180" height="180">'
    + "\n  <!-- A note. -->\n"));
  assert.match(doc, /<\/svg>\n$/);
  assert.deepEqual(references(doc), ids(doc));
  assert.equal(ids(doc).length, 1);
});
