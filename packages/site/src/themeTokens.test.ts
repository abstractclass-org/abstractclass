// Checks the reading of a site's theme tokens (themeTokens.ts): every block of a theme, no nested block, and a site's
// sheets in the order of its own sheet's @import lines. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { block, siteThemes, themes } from "./themeTokens.ts";

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

test("a site's tokens: the sheets that its own sheet imports, in their order, then its own", t => {
  const dir = mkdtempSync(join(tmpdir(), "theme-tokens-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const sheet = (name: string, ...lines: string[]) => writeFileSync(join(dir, name), [...lines, ""].join("\n"));
  sheet("shared.css", LIGHT, "  --bg: #fff;", "  --accent: #111111;", "}", DARK, "  --bg: #000;", "}");
  sheet("view.css", LIGHT, "  --accent: #222222;", "  --line: #333333;", "}", DARK, "  --line: #444444;", "}");
  sheet("plain.css", ".btn { color: red; }"); // a sheet with no theme's block gives no tokens
  // Tailwind's import names no .css file: it is not read. An @import in a comment, not at a line's start, is not one.
  sheet("app.css", '@import "tailwindcss";', '@import "./shared.css";', '/* then @import "./missing.css" */',
        '@import "./view.css";', '@import "./plain.css";', LIGHT, "  --accent: #6f5aa8;", "}", DARK, "  --accent: #b8a6e8;",
        "}");
  assert.deepEqual(siteThemes(join(dir, "app.css")), {
    light: { "--bg": "#fff", "--accent": "#6f5aa8", "--line": "#333333" },
    dark: { "--bg": "#000", "--accent": "#b8a6e8", "--line": "#444444" },
  });
});
