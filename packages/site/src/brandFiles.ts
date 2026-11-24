// A site's logo files from its drawings (brand.ts and brandGradient.ts), as Cyanotype's and Mistak's scripts/brand.mjs
// write them (Cyanotype's design 33, "The logo"):
// - src/lib/assets/favicon.svg: the simple drawing, the favicon that the page names.
// - static/favicon.ico: the simple drawing at 16, 32 and 48 pixels, for browsers without SVG icons and for the clients
//   that ask for /favicon.ico without reading the page, as Hedge School's (its scripts/favicon.mjs, design 12). The
//   ICO file's form is the sites' one (ico.ts).
// - static/apple-touch-icon.png: the full drawing on a full square of 180 pixels, for iOS's home screen.
// - static/brand/card.png: the link preview picture, 1,200 × 630 pixels.
// - static/brand/<site>.svg: the simple drawing, the head that partner sites put on their buttons (the /developers
//   page, "Buttons").
// The site's script gives the browser: headless Chromium, off the GPU on Windows, as the layout test runs it
// (chromium.ts). This file imports no browser, so the package needs no Playwright. It runs in Node only, and no page
// imports it. The paths are the site's folder's: the script runs there.
import { writeFileSync } from "node:fs";
import { icoFile } from "./ico.ts";
import { drawingDocument, type Drawing } from "./brandGradient.ts";

/** The part of Playwright's browser that the drawing uses. */
interface Browser {
  newPage(options: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<{
    setContent(html: string): Promise<void>;
    screenshot(options: { omitBackground: boolean }): Promise<Buffer>;
    close(): Promise<void>;
  }>;
}

/** The sizes in the ICO file. */
const ICO_SIZES = [16, 32, 48];

/** An SVG document drawn as a PNG of width × height pixels, with a clear background. */
async function png(browser: Browser, doc: string, width: number, height = width): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html, body { margin: 0; background: transparent; } svg { display: block; }</style>${doc}`);
  const image = await page.screenshot({ omitBackground: true });
  await page.close();
  const w = image.readUInt32BE(16), h = image.readUInt32BE(20); // the PNG's IHDR
  if (w !== width || h !== height) throw new Error(`Chromium drew ${w} × ${h} pixels, not ${width} × ${height}`);
  return image;
}

/** The site's drawings and texts that its files take. */
export interface BrandDrawings {
  /** The favicon's file: the simple drawing as an SVG document. */
  favicon: string;
  /** The head for partner sites' buttons: its name under static/brand/ (`cyanotype.svg`), and its SVG document. */
  head: readonly [file: string, svg: string];
  /** The simple drawing, for the ICO file. */
  small: Drawing;
  /** The iOS icon's drawing: a full square, with no transparent pixel. */
  touch: Drawing;
  /** The link preview picture: its SVG document, its width and its height. */
  card: readonly [svg: string, width: number, height: number];
}

/** Writes the site's logo files, and gives a line that names them. */
export async function writeBrandFiles(browser: Browser, d: BrandDrawings): Promise<string> {
  writeFileSync("src/lib/assets/favicon.svg", d.favicon);
  writeFileSync(`static/brand/${d.head[0]}`, d.head[1]);

  const images: Buffer[] = [];
  for (const size of ICO_SIZES) images.push(await png(browser, drawingDocument(d.small, size, "small"), size));
  const ico = icoFile(images);
  writeFileSync("static/favicon.ico", ico);

  writeFileSync("static/apple-touch-icon.png", await png(browser, drawingDocument(d.touch, 180, "touch"), 180));
  writeFileSync("static/brand/card.png", await png(browser, ...d.card));
  return `src/lib/assets/favicon.svg, static/favicon.ico (${ICO_SIZES.join(", ")} pixels, ${ico.length} bytes), `
    + `static/apple-touch-icon.png, static/brand/card.png, static/brand/${d.head[0]}`;
}
