// Checks the partners' buttons' sample style (buttonStyle.ts): Hedge School's stays as its page gave it before the
// style moved here, and each site's style differs from it only in the class name. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buttonCss } from "./buttonStyle.ts";

// Hedge School's style as its /developers gave it before the style had one source.
const HEDGE_SCHOOL = `.hedge-school-button {
  display: inline-flex; align-items: center; gap: 0.45em;
  padding: 0.35em 0.95em 0.35em 0.45em; border: 0; border-radius: 999px;
  background: #b8a6e8; color: #16181c; font: 600 15px/1.4 system-ui, sans-serif;
  text-decoration: none; cursor: pointer;
}
.hedge-school-button:hover { background: #c6b8ee; }
.hedge-school-button img { width: 1.5em; height: 1.5em; margin: 0; flex: none; }`;

test("Hedge School's style is the same, byte for byte", () => {
  assert.equal(buttonCss("hedge-school-button"), HEDGE_SCHOOL);
});

test("another site's style differs only in the class name", () => {
  assert.equal(buttonCss("cyanotype-button"), HEDGE_SCHOOL.replaceAll("hedge-school-button", "cyanotype-button"));
});
