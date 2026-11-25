// The site's own failures that are not the engine's, on Hedge School and Cyanotype: the image of a line that the site
// did not make, an export that did not complete, and the practice games that the site did not delete. Each shows the
// site's line in strict Simplified Technical English (what failed, then what the player can do), and the error's
// message goes into the error report only (design 17, "Error reports": siteError), with no engine_error event. The page
// never shows the message. engine-failure.spec.ts checks the engine's failures in the same way. The image and the
// export run on the Analysis board, whose parts are the review's (ReviewView, ExportMenu), with the engine off. Mistak
// has none of the three yet: the image and the export come with its Analysis board (abscls-shfz.18.12), and the
// practice games with its Practice (abscls-shfz.18.22).
import { expect, test, type Page } from "./page-log.ts";
import { answerPostHog, lookLikeAVisitor, type Sent } from "./posthog.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { keepBefore } from "./keep-before.ts";
import { testRecord } from "./cyanotype-review.ts";
import { BROWSER_NUMBER_KEY, CONSENT_KEY, ENGINE_KEY } from "../src/lib/keys.ts";
import { ENGINE_KEY as CYANOTYPE_ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

const SITES = [
  { site: "Hedge School", base: () => test.info().project.use.baseURL!, engineKey: ENGINE_KEY,
    record: "1. D10-G10 2. N11-Q10 L10-N11 *", number: BROWSER_NUMBER_KEY },
  { site: "Cyanotype", base: () => CYANOTYPE!, engineKey: CYANOTYPE_ENGINE_KEY, record: CYANOTYPE ? testRecord() : "",
    number: "cyanotype:browser-number:1" },
];

const IMAGE_FAILED = "The site did not make the image. Try again.";
const EXPORT_FAILED = "The site did not complete the export. Try again.";
const DELETE_FAILED = "The site did not delete your practice games. Try again later.";

/** The code's messages of the faults below: the error report holds each, and the page shows none. */
const NO_IMAGE = "the browser made no image";
const NO_CLIPBOARD = "Write permission denied for this test.";
const NO_DELETE = "the site could not delete them (503)";

/** The events of the site's caught failures of one kind: PostHog's exception, and never the engine's event. */
const reports = (sent: Sent[], kind: string) =>
  sent.filter(e => (e.event === "engine_error" || e.event === "$exception") && e.properties.error_kind === kind)
    .map(e => e.event);
/** The messages of the error reports of one kind: the code's, which the page does not show. */
const messages = (sent: Sent[], kind: string) =>
  sent.filter(e => e.event === "$exception" && e.properties.error_kind === kind)
    .flatMap(e => (e.properties.$exception_list as { value: string }[]).map(x => x.value));

/** The site's red line `line` in its note (the toast, beside its Close button, or the Privacy page's status line),
 *  and no text holds the error's message `message`. A note with other words fails with its text. */
async function shows(page: Page, line: string, message: string) {
  await expect(page.getByRole("status").filter({ hasText: /\bsite\b|Export/ })).toContainText(line, { timeout: 30_000 });
  await expect(page.getByText(message)).toHaveCount(0);
}

lookLikeAVisitor();

for (const { site, base, engineKey, record, number } of SITES) {
  test.describe(site, () => {
    test.skip(site === "Cyanotype" && CYANOTYPE === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    let sent: Sent[];
    let page: Page;
    test.beforeEach(async ({ context }) => {
      sent = await answerPostHog(context);
      page = await context.newPage();
      await declineGames(context);
      await keepBefore(page, CONSENT_KEY, { games: "denied" });
      await keepBefore(page, engineKey, { on: false, gpu: "off" });
      await page.setViewportSize({ width: 1376, height: 952 });
    });

    /** The Analysis board of the record, ready: its Export menu opens. */
    async function analysis() {
      await page.goto(new URL(`/analysis#${new URLSearchParams({ record })}`, base()).href);
      await expect(page.getByRole("button", { name: "Export" }).first()).toBeEnabled({ timeout: 120_000 });
    }

    test("an image that the browser does not make: the line, and one report with the code's message", async () => {
      // The canvas gives no PNG, as a browser out of memory does
      await page.addInitScript(() => {
        HTMLCanvasElement.prototype.toBlob = function (done: BlobCallback) { setTimeout(() => done(null)); };
      });
      await analysis();
      await page.locator(".mv").nth(1).click({ button: "right" });
      await page.getByRole("menuitem", { name: "Generate image" }).click();
      await page.getByRole("menuitem", { name: "Save static" }).click();
      await shows(page, IMAGE_FAILED, NO_IMAGE);
      await expect.poll(() => reports(sent, "image"), { timeout: 15_000 }).toEqual(["$exception"]);
      expect(messages(sent, "image")).toEqual([NO_IMAGE]);
    });

    test("an export that the clipboard refuses: the line, and one report with the code's message", async () => {
      await page.addInitScript(message => {
        Clipboard.prototype.writeText = () => Promise.reject(new DOMException(message, "NotAllowedError"));
      }, NO_CLIPBOARD);
      await analysis();
      await page.getByRole("button", { name: "Export" }).first().click();
      await page.getByRole("menuitem", { name: /^Copy a link to share the analysis/ }).click();
      await shows(page, EXPORT_FAILED, NO_CLIPBOARD);
      await expect.poll(() => reports(sent, "export"), { timeout: 15_000 }).toEqual(["$exception"]);
      // PostHog writes a DOMException as its name and its message
      expect(messages(sent, "export")).toEqual([`NotAllowedError: ${NO_CLIPBOARD}`]);
    });

    test("a delete that the site's store refuses: the line, one report, and the button stays", async ({ context }) => {
      await page.addInitScript(([key, id]) => localStorage.setItem(key, id), [number, "0123456789abcdef"]);
      await context.route("**/api/practice-games", r =>
        r.request().method() === "DELETE" ? r.fulfill({ status: 503, body: "" }) : r.fallback());
      await page.goto(new URL("/privacy", base()).href);
      const remove = page.getByRole("button", { name: "Delete my practice games" });
      await remove.click({ timeout: 30_000 }); // a build that stores practice games, as check:all's and CI's
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await shows(page, DELETE_FAILED, NO_DELETE);
      await expect(remove).toBeEnabled(); // the way out: a later try
      await expect.poll(() => reports(sent, "delete"), { timeout: 15_000 }).toEqual(["$exception"]);
      expect(messages(sent, "delete")).toEqual([NO_DELETE]);
    });
  });
}
