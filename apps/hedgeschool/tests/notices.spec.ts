// Each site's Notices page names the works of others that the site ships (design 11), from the shared parts of
// packages/site. Hedge School's tests run on the preview of BASE_URL. Cyanotype's tests run when CYANOTYPE_BASE_URL
// gives its preview. The tests on each page:
//   - The font Fira Code, its copyright line and its licence, the SIL Open Font License 1.1 (design 11, item 10, and
//     design 06, item 11). The licence asks that each copy of the font carries the copyright line and the licence. The
//     page gives both as the package's own LICENSE file has them (LibraryNotices.svelte).
//   - ONNX Runtime Web, which the engine on the GPU uses: its version and its copyright line, as the npm package has
//     them (LibraryNotices.svelte).
//   - The engine's section (EngineNotices.svelte): its links to the release's LICENSE.txt and NOTICES.txt open the
//     files that the site ships, the outputs paragraph is LICENSE.txt's section "The engine's outputs" word for word,
//     and KataGo's copyright notice is NOTICES.txt's. The build's ONNX Runtime files are the version that the page
//     names. A build with no engine files (before `npm run engine`) skips this test.
// Run: npm run test:layout -- tests/notices.spec.ts
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// The packages' files, by their paths from apps/hedgeschool, where the browser tests run. The font's LICENSE file has
// the copyright line first, and the licence runs from its title to the file's end. ONNX Runtime Web's files start with
// a banner that holds its copyright line. A file of another shape stops the test here.
const read = (path: string) => readFileSync(`../../node_modules/${path}`, "utf8").replace(/\r\n/g, "\n");
const LICENSE = read("@fontsource-variable/fira-code/LICENSE");
const COPYRIGHT = LICENSE.match(/^Copyright \d{4}.*/)?.[0];
const OFL = LICENSE.match(/SIL OPEN FONT LICENSE Version 1\.1[\s\S]*/)?.[0].trim();
if (!COPYRIGHT || !OFL) throw new Error("The font's LICENSE file has no copyright line first, or no licence title");
const ORT_VERSION: string = JSON.parse(read("onnxruntime-web/package.json")).version;
const ORT_BANNER = read("onnxruntime-web/dist/ort.webgpu.min.mjs").slice(0, 500);
const ORT_COPYRIGHT = ORT_BANNER.match(/Copyright \(c\) Microsoft.*/)?.[0];
if (!ORT_COPYRIGHT) throw new Error("ONNX Runtime Web's ort.webgpu.min.mjs has no copyright line in its banner");
const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

/** The words of a text, with a list's dashes and the lines' breaks gone. */
const words = (text: string) => text.replace(/^- /gm, "").split(/\s+/).filter(Boolean).join(" ");

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

  test(`${site}'s Notices page names ONNX Runtime Web, its version and its copyright line`, async ({ page }) => {
    test.skip(!url, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    await page.goto(url);
    const text = await page.locator("main").innerText();
    await expect(page.locator("main a", { hasText: "ONNX Runtime Web" }))
      .toHaveAttribute("href", "https://github.com/microsoft/onnxruntime");
    expect(text).toContain(`ONNX Runtime Web ${ORT_VERSION}, under the MIT licence`);
    expect(text).toContain(ORT_COPYRIGHT);
    await expect(page.locator("main a", { hasText: "ThirdPartyNotices.txt" })).toHaveAttribute("href",
      `https://github.com/microsoft/onnxruntime/blob/v${ORT_VERSION}/ThirdPartyNotices.txt`);
  });

  test(`${site}'s Notices page links to the engine's terms and notices that the site ships`, async ({ page }) => {
    test.skip(!url, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    await page.goto(url);
    const manifest = await page.request.get(new URL("/engine/manifest.json", page.url()).href);
    test.skip(!manifest.ok(), "the build has no engine files (npm run engine)");
    const ids: string[] = (await manifest.json()).artifacts.map((a: { id: string }) => a.id);
    expect(ids, "the build's ONNX Runtime files").toContain(`ort-${ORT_VERSION}`);
    const file = async (name: string) => {
      const href = await page.locator("main").getByRole("link", { name, exact: true }).getAttribute("href");
      expect(href, name).toMatch(new RegExp(`^/engine/[^/]+/${name.replace(".", "\\.")}$`));
      const response = await page.request.get(new URL(href!, page.url()).href);
      expect(response.status(), href!).toBe(200);
      return (await response.text()).replace(/\r\n/g, "\n");
    };
    const terms = await file("LICENSE.txt"), notices = await file("NOTICES.txt");
    const outputs = terms.match(/\nThe engine's outputs\n-+\n([\s\S]*?)\n\n\n/)?.[1];
    expect(outputs, "LICENSE.txt's section \"The engine's outputs\"").toBeTruthy();
    const paragraph = await page.locator("main p", { hasText: "The engine's outputs." }).innerText();
    expect(words(paragraph)).toBe(`The engine's outputs. ${words(outputs!)}`);
    expect(notices).toContain((await page.locator("main pre", { hasText: "lightvector" }).innerText()).trim());
  });
}
