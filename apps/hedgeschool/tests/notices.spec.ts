// Each site's Notices page names the font Fira Code, its copyright line and its licence, the SIL Open Font License 1.1
// (design 11, item 10, and design 06, item 11). The licence asks that each copy of the font carries the copyright line
// and the licence. The page gives both as the package's own LICENSE file has them. Both pages show the entry of
// packages/site's LibraryNotices.svelte. Hedge School's test runs on the preview of BASE_URL. Cyanotype's test runs
// when CYANOTYPE_BASE_URL gives its preview.
// Run: npm run test:layout -- tests/notices.spec.ts
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// The package's LICENSE file, by its path from apps/hedgeschool, where the browser tests run. Its first line is the
// copyright line, and the licence runs from its title to the file's end. A file of another shape stops the test here.
const LICENSE = readFileSync("../../node_modules/@fontsource-variable/fira-code/LICENSE", "utf8").replace(/\r\n/g, "\n");
const COPYRIGHT = LICENSE.match(/^Copyright \d{4}.*/)?.[0];
const OFL = LICENSE.match(/SIL OPEN FONT LICENSE Version 1\.1[\s\S]*/)?.[0].trim();
if (!COPYRIGHT || !OFL) throw new Error("The font's LICENSE file has no copyright line first, or no licence title");
const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

for (const [site, url] of Object.entries({
  "Hedge School": "/notices",
  "Cyanotype": CYANOTYPE ? new URL("/notices", CYANOTYPE).href : "",
})) {
  test(`${site}'s Notices page names Fira Code, its copyright line and its licence`, async ({ page }) => {
    test.skip(!url, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    await page.goto(url);
    const text = await page.locator("main").innerText();
    await expect(page.locator("main a", { hasText: "Fira Code" })).toHaveCount(1);
    expect(text).toContain(COPYRIGHT);
    expect(text).toContain(OFL);
  });
}
