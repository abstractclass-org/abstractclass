// Draws Mistak's logo files (design 34, "The site's frame") from its drawings (src/lib/brand/logo.ts, card.ts):
// - src/lib/assets/favicon.svg: the simple drawing, the favicon that the page names.
// - static/favicon.ico: the simple drawing at 16, 32 and 48 pixels.
// - static/apple-touch-icon.png: the full drawing on a full square of 180 pixels, for iOS's home screen.
// - static/brand/card.png: the link preview picture, 1,200 × 630 pixels.
// - static/brand/mistak.svg: the simple drawing, the head that partner sites put on their buttons.
// The files and their drawing are every site's (@abstractclass/site/brandFiles.ts). Headless Chromium draws each
// picture at its own size, off the GPU on Windows, as the layout test runs it (@abstractclass/site/chromium.ts). Run it
// again after a change of the drawings:
//   cd apps/mistak && node scripts/brand.mjs
import { chromium } from "@playwright/test";
import { writeBrandFiles } from "@abstractclass/site/brandFiles.ts";
import { OFF_THE_GPU } from "@abstractclass/site/chromium.ts";
import { card, CARD_HEIGHT, CARD_WIDTH } from "../src/lib/brand/card.ts";
import { BUTTON_HEAD_SVG, FAVICON_SVG, LOGO_SMALL, TOUCH_ICON } from "../src/lib/brand/logo.ts";

const browser = await chromium.launch({ args: [...OFF_THE_GPU] });
try {
  console.log(await writeBrandFiles(browser, {
    favicon: FAVICON_SVG, head: ["mistak.svg", BUTTON_HEAD_SVG], small: LOGO_SMALL, touch: TOUCH_ICON,
    card: [card(), CARD_WIDTH, CARD_HEIGHT],
  }));
} finally {
  await browser.close();
}
