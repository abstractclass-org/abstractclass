// Draws Cyanotype's logo files (design 33, "The logo") from its drawings (src/lib/brand/logo.ts, card.ts):
// - src/lib/assets/favicon.svg: the simple drawing, the favicon that the page names.
// - static/favicon.ico: the simple drawing at 16, 32 and 48 pixels, for browsers without SVG icons and for the clients
//   that ask for /favicon.ico without reading the page, as Hedge School's (its scripts/favicon.mjs, design 12). The
//   ICO file's form is the sites' one (@abstractclass/site/ico.ts).
// - static/apple-touch-icon.png: the full print on a full square of 180 pixels, for iOS's home screen.
// - static/brand/card.png: the link preview picture, 1,200 × 630 pixels.
// Headless Chromium draws each picture at its own size, off the GPU on Windows, as the layout test runs it
// (@abstractclass/site/chromium.ts). Run it again after a change of the drawings:
//   cd apps/cyanotype && node scripts/brand.mjs
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { OFF_THE_GPU } from "@abstractclass/site/chromium.ts";
import { icoFile } from "@abstractclass/site/ico.ts";
import { card, CARD_HEIGHT, CARD_WIDTH } from "../src/lib/brand/card.ts";
import { FAVICON_SVG, LOGO_SMALL, svgDocument, TOUCH_ICON } from "../src/lib/brand/logo.ts";

const ICO_SIZES = [16, 32, 48];
const browser = await chromium.launch({ args: [...OFF_THE_GPU] });

/** An SVG document drawn as a PNG of width × height pixels, with a clear background. */
async function png(doc, width, height = width) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html, body { margin: 0; background: transparent; } svg { display: block; }</style>${doc}`);
  const image = await page.screenshot({ omitBackground: true });
  await page.close();
  const w = image.readUInt32BE(16), h = image.readUInt32BE(20); // the PNG's IHDR
  if (w !== width || h !== height) throw new Error(`Chromium drew ${w} × ${h} pixels, not ${width} × ${height}`);
  return image;
}

try {
  writeFileSync("src/lib/assets/favicon.svg", FAVICON_SVG);

  const images = [];
  for (const size of ICO_SIZES) images.push(await png(svgDocument(LOGO_SMALL, size), size));
  const ico = icoFile(images);
  writeFileSync("static/favicon.ico", ico);

  writeFileSync("static/apple-touch-icon.png", await png(svgDocument(TOUCH_ICON, 180), 180));
  writeFileSync("static/brand/card.png", await png(card(), CARD_WIDTH, CARD_HEIGHT));
  console.log(`src/lib/assets/favicon.svg, static/favicon.ico (${ICO_SIZES.join(", ")} pixels, ${ico.length} bytes), `
    + "static/apple-touch-icon.png, static/brand/card.png");
} finally {
  await browser.close();
}
