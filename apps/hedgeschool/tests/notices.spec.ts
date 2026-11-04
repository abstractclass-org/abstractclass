// Each site's Notices page names the font Fira Code, with the copyright line of the package's own LICENSE file
// (node_modules/@fontsource-variable/fira-code) and the SIL Open Font License 1.1, which asks that each copy of the font
// carries both. Both pages show the entry of packages/site's LibraryNotices.svelte. Hedge School's test runs on the
// preview of BASE_URL, Cyanotype's when CYANOTYPE_BASE_URL gives its preview. Run: npm run test:layout -- tests/notices.spec.ts
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const LICENSE = readFileSync("../../node_modules/@fontsource-variable/fira-code/LICENSE", "utf8").replace(/\r\n/g, "\n");
const COPYRIGHT = LICENSE.split("\n")[0];
const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

for (const [site, base] of [["Hedge School", undefined], ["Cyanotype", CYANOTYPE]] as const) {
  test(`${site}'s Notices page names Fira Code, its copyright line and its licence`, async ({ page }) => {
    test.skip(site === "Cyanotype" && !base, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    expect(COPYRIGHT, "the package's LICENSE file starts with its copyright line").toMatch(/^Copyright \d{4}/);
    await page.goto(base ? new URL("/notices", base).href : "/notices");
    const text = (await page.locator("main").innerText()).replace(/\r\n/g, "\n");
    await expect(page.locator("main a", { hasText: "Fira Code" })).toHaveCount(1);
    expect(text).toContain(COPYRIGHT);
    // The licence's text, from its title to its last line, as the package has it.
    const licence = LICENSE.slice(LICENSE.indexOf("SIL OPEN FONT LICENSE Version 1.1")).trim();
    expect(text).toContain(licence);
  });
}
