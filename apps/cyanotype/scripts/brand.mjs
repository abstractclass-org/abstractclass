// Draws Cyanotype's logo files (design 33, "The logo") from its drawings (src/lib/brand/logo.ts, card.ts):
// - src/lib/assets/favicon.svg: the simple drawing, the favicon that the page names.
// - static/favicon.ico: the simple drawing at 16, 32 and 48 pixels, for browsers without SVG icons and for the clients
//   that ask for /favicon.ico without reading the page, as Hedge School's (its scripts/favicon.mjs, design 12).
// - static/apple-touch-icon.png: the full print on a full square of 180 pixels, for iOS's home screen.
// - static/brand/card.png: the link preview picture, 1,200 × 630 pixels.
// Each picture is drawn by headless Chromium at its own size, with Hedge School's layout test's launch options (its
// playwright.config.ts: off the GPU on Windows). Run it again after a change of the drawings:
//   cd apps/cyanotype && node scripts/brand.mjs
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import config from "../../hedgeschool/playwright.config.ts";
import { card, CARD_HEIGHT, CARD_WIDTH } from "../src/lib/brand/card.ts";
import { FAVICON_SVG, LOGO_SMALL, svgDocument, TOUCH_ICON } from "../src/lib/brand/logo.ts";

const ICO_SIZES = [16, 32, 48];
const { launchOptions } = config.projects.find(p => p.name === "chromium").use;
const browser = await chromium.launch(launchOptions);

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

  // The ICO file: a header, one entry for each image, then the images as PNG (Windows Vista's form, which every
  // current browser reads).
  const images = [];
  for (const size of ICO_SIZES) images.push(await png(svgDocument(LOGO_SMALL, size), size));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2); // an icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((image, k) => {
    const at = 6 + 16 * k;
    header.writeUInt8(ICO_SIZES[k] % 256, at); // the width and the height, 0 for 256
    header.writeUInt8(ICO_SIZES[k] % 256, at + 1);
    header.writeUInt16LE(1, at + 4); // planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(image.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += image.length;
  });
  writeFileSync("static/favicon.ico", Buffer.concat([header, ...images]));

  writeFileSync("static/apple-touch-icon.png", await png(svgDocument(TOUCH_ICON, 180), 180));
  writeFileSync("static/brand/card.png", await png(card(), CARD_WIDTH, CARD_HEIGHT));
  console.log(`src/lib/assets/favicon.svg, static/favicon.ico (${ICO_SIZES.join(", ")} pixels, ${offset} bytes), `
    + "static/apple-touch-icon.png, static/brand/card.png");
} finally {
  await browser.close();
}
