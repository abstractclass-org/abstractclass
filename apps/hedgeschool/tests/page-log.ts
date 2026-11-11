// Playwright's test with the page log: each page error, console error, failed request, HTTP error and page crash in
// the case's own context, with the time since the case started. A case that fails gets the log as the file
// page-log.txt in its folder of test-results, which keeps it after the run, so that a failure that happens only under
// load keeps its evidence (abscls-z0jz). A case that passes writes nothing. A spec file takes it in place of
// @playwright/test's own: `import { expect, test } from "./page-log.ts"`. `npm run check:all` refuses a spec that takes
// `test` from @playwright/test (scripts/spec-page-log.mjs). A context that a case makes itself
// (browser.newContext) is not in the log. Playwright's trace keeps the same events, but it also writes each
// response's body, the engine's files too, for every case.
import { writeFile } from "node:fs/promises";
import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";
export type { Page, Request } from "@playwright/test";

export const test = base.extend<{ pageLog: void }>({
  pageLog: [async ({ context }, use, testInfo) => {
    const lines: string[] = [], start = Date.now();
    const log = (text: string) => lines.push(`${((Date.now() - start) / 1000).toFixed(1)} s  ${text}`);
    // A script that did not load gives a page error with no text: the failed request's line names it.
    context.on("weberror", e => log(`page error: ${e.error().stack || e.error().message || e.error().name}`));
    context.on("console", m => { if (m.type() === "error") log(`console error: ${m.text()} (${m.location().url})`); });
    context.on("requestfailed", r => log(`request failed: ${r.method()} ${r.url()}: ${r.failure()?.errorText}`));
    context.on("response", r => { if (r.status() >= 400) log(`HTTP ${r.status()}: ${r.request().method()} ${r.url()}`); });
    context.on("page", page => page.on("crash", () => log("the page crashed")));
    await use();
    if (testInfo.status !== testInfo.expectedStatus) {
      // A file, not an attachment's body: Playwright writes no body to test-results, and its list cuts it short.
      const path = testInfo.outputPath("page-log.txt");
      await writeFile(path, lines.join("\n") || "(nothing)");
      await testInfo.attach("page-log", { path, contentType: "text/plain" });
    }
  }, { auto: true }],
});
