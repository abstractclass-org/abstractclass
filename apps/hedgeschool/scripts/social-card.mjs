// Writes the colours of scripts/social-card.html, the page that the link preview picture is drawn from (design 23):
// between its marks, the value in the site's dark theme of each token that the page uses after them (`var(--name)`).
// The tokens are those of src/app.css and of the sheets that it imports (@abstractclass/site/themeTokens.ts), as
// Cyanotype's picture takes them (its src/lib/brand/card.ts). Run it again after a change of the tokens or of the
// page's colours, then draw the picture again (the page's comment gives the command):
//   cd apps/hedgeschool && node scripts/social-card.mjs
// With --check it writes nothing, and fails when the page's colours are not the tokens' (npm run check:all).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { siteTokens } from "@abstractclass/site/themeTokens.ts";

const page = fileURLToPath(new URL("social-card.html", import.meta.url));
const token = siteTokens(new URL("../src/app.css", import.meta.url), "dark");
const html = readFileSync(page, "utf8");
const START = "/* social-card.mjs: start */", END = "/* social-card.mjs: end */";
const start = html.indexOf(START) + START.length, end = html.indexOf(END);
if (start < START.length || end < start) throw new Error(`social-card: social-card.html has no ${START} ... ${END}`);
const names = [...new Set([...html.slice(end).matchAll(/var\((--[\w-]+)\)/g)].map(m => m[1]))];
const values = names.map(name => `    ${name}: ${token(name)};\n`).join("");
const written = `${html.slice(0, start)}\n  :root {\n${values}  }\n  ${html.slice(end)}`;

if (!process.argv.includes("--check")) writeFileSync(page, written);
else if (written !== html) {
  throw new Error("social-card: the colours of social-card.html are not the site's tokens: run social-card.mjs");
}
