// Writes scripts/social-card.html, the page that the link preview picture is drawn from (design 23), in the site's dark
// theme: its colours are the site's tokens, from the style sheets that src/app.css imports and from app.css
// (@abstractclass/site/themeTokens.ts), as Cyanotype's picture takes them (its src/lib/brand/card.ts). Run it again
// after a change of the page or of the tokens, then draw the picture again (the page's comment gives the command):
//   cd apps/hedgeschool && node scripts/social-card.mjs
// With --check it writes nothing, and fails when social-card.html is not what it would write (npm run check:all).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { siteThemes } from "@abstractclass/site/themeTokens.ts";

const page = fileURLToPath(new URL("social-card.html", import.meta.url));
const { dark } = siteThemes(new URL("../src/app.css", import.meta.url));
/** A token's colour in the dark theme. A token that the sheets do not hold stops the script. */
function token(name) {
  if (!dark[name]) throw new Error(`social-card: the site's style sheets give no ${name} in the dark theme`);
  return dark[name];
}
const BG = token("--bg"), TEXT = token("--text"), MUTED = token("--muted"), LEAD = token("--accent");
const BOARD = token("--board-bg"), DOT = token("--board-dot"), BLUE = token("--blue"), RED = token("--red");
// The grey of the line under the lead is the card's own, between the text's and the muted text's.
const ABOUT = "#c9cace";

const html = `<!doctype html>
<!-- The image that link previews show (design 23): 1,200 × 630 pixels, Open Graph's size. Drawn by the browser:
       "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars
         --force-device-scale-factor=1 --window-size=1200,630 --screenshot=<repo>/static/brand/card.png
         file:///<repo>/scripts/social-card.html
     Only the owner runs it: Edge starts only when the owner asks (scripts/edge.mjs says why).
     Written by scripts/social-card.mjs: change that script, not this file. The colours are the site's dark theme: the
     shared tokens (packages/site/src/site.css) and Hedge School's own (src/app.css). The grey of the line under the
     lead (${ABOUT}) is the card's own, between the text's and the muted text's. The board is a corner of a position:
     Blue's edges, and Red's with the region it encloses. -->
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: ${BG}; color: ${TEXT}; font-family: "Segoe UI", system-ui, sans-serif;
    display: grid; grid-template-columns: 560px 1fr; align-items: center;
  }
  .board { margin-left: 56px; width: 470px; height: 470px; border-radius: 18px; background: ${BOARD}; }
  .text { padding: 0 64px 0 40px; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .brand img { width: 92px; height: 92px; }
  h1 { margin: 0; font-size: 62px; font-weight: 700; letter-spacing: -1px; white-space: nowrap; }
  .lead { margin: 30px 0 0; font-size: 46px; font-weight: 600; color: ${LEAD}; }
  .about { margin: 22px 0 0; font-size: 30px; line-height: 1.35; color: ${ABOUT}; }
  .url { margin: 34px 0 0; font-size: 26px; color: ${MUTED}; }
</style>
</head>
<body>
  <svg class="board" viewBox="-0.6 -0.6 10.2 10.2">
    <!-- The lattice: 10 × 10 points of the board. -->
    <g id="dots" fill="${DOT}"></g>
    <!-- Red's region, then the edges. -->
    <polygon points="6,2 9,2 9,5" fill="${RED}" fill-opacity="0.28" />
    <g stroke-linecap="round" stroke-width="0.2">
      <g stroke="${BLUE}">
        <line x1="0" y1="5" x2="3" y2="5" /><line x1="3" y1="5" x2="4" y2="3" /><line x1="3" y1="5" x2="5" y2="7" />
        <line x1="5" y1="7" x2="2" y2="8" /><line x1="4" y1="3" x2="2" y2="1" />
      </g>
      <g stroke="${RED}">
        <line x1="6" y1="2" x2="9" y2="2" /><line x1="9" y1="2" x2="9" y2="5" /><line x1="6" y1="2" x2="9" y2="5" />
        <line x1="9" y1="5" x2="7" y2="7" /><line x1="7" y1="7" x2="8" y2="9" />
      </g>
    </g>
    <g fill="${TEXT}">
      <circle cx="0" cy="5" r="0.14" /><circle cx="3" cy="5" r="0.14" /><circle cx="4" cy="3" r="0.14" />
      <circle cx="5" cy="7" r="0.14" /><circle cx="2" cy="8" r="0.14" /><circle cx="2" cy="1" r="0.14" />
      <circle cx="6" cy="2" r="0.14" /><circle cx="9" cy="2" r="0.14" /><circle cx="9" cy="5" r="0.14" />
      <circle cx="7" cy="7" r="0.14" /><circle cx="8" cy="9" r="0.14" />
    </g>
  </svg>
  <div class="text">
    <div class="brand"><img src="../static/brand/hedge-school.svg" alt="" /><h1>Hedge School</h1></div>
    <p class="lead">Learn Enclosure</p>
    <p class="about">Review your games and analyze any position, with an engine that runs in your browser.</p>
    <p class="url">hedgeschool.abstractclass.org</p>
  </div>
  <script>
    document.getElementById("dots").innerHTML = Array.from({ length: 100 }, (_, i) =>
      \`<circle cx="\${i % 10}" cy="\${Math.floor(i / 10)}" r="0.08"/>\`).join("");
  </script>
</body>
</html>
`;

if (process.argv.includes("--check")) {
  if (readFileSync(page, "utf8") !== html) {
    throw new Error("social-card: scripts/social-card.html is not what scripts/social-card.mjs writes: run it again");
  }
} else {
  writeFileSync(page, html);
}
