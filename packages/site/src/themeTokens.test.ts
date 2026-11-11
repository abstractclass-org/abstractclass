// Checks the reading of a site's theme tokens (themeTokens.ts): every block of a theme, and no nested block. Run:
// npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { block, themes } from "./themeTokens.ts";

const LIGHT = ':root, [data-theme="light"] {';
const DARK = ':root[data-theme="dark"] {';

test("a theme's tokens can come in several blocks of one style sheet, and a later block's token wins", () => {
  const css = [LIGHT, "  --accent: #6f5aa8;", "}", DARK, "  --accent: #b8a6e8;", "}", "",
               LIGHT, "  --board-bg: #f3ead7;", "  --accent: #000000;", "}", DARK, "  --board-bg: #3a362e;", "}", ""].join("\n");
  const { light, dark } = themes(block(css, LIGHT), block(css, DARK));
  assert.deepEqual(light, { "--accent": "#000000", "--board-bg": "#f3ead7" });
  assert.deepEqual(dark, { "--accent": "#b8a6e8", "--board-bg": "#3a362e" });
});

test("a block nested in another one is not a theme's block", () => {
  const css = [":root {", "  --bg: #fff;", "}", "@media (prefers-color-scheme: dark) {", "  :root {", "    --bg: #000;",
               "  }", "}", ""].join("\n");
  assert.deepEqual(themes(block(css, ":root {"), "").light, { "--bg": "#fff" });
});

test("a style sheet with no such block is refused", () => {
  assert.throws(() => block("a { color: red; }\n", LIGHT), /no ":root, \[data-theme="light"\] \{" block/);
});
