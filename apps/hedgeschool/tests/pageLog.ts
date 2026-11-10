// Playwright's test with the page's log: each page error, each console error and each request that failed or gave an
// HTTP error, in every page of the case's own context, with the time since the case started. A case that fails gets
// the log as the attachment "page-log", so that a failure that happens only under load keeps its evidence
// (abscls-z0jz). A case that passes attaches nothing. The listeners only add lines to an array: they cost the suite no
// time worth naming. A spec file takes it in place of @playwright/test's own: `import { expect, test } from
// "./pageLog.ts"`. A context that a case makes itself (browser.newContext) is not in the log.
import { test as base, type Page } from "@playwright/test";

export { expect } from "@playwright/test";
export type { Page, Request } from "@playwright/test";

export const test = base.extend<{ pageLog: string[] }>({
  pageLog: [async ({ context }, use, testInfo) => {
    const lines: string[] = [], start = Date.now();
    const log = (text: string) => lines.push(`${((Date.now() - start) / 1000).toFixed(1)} s  ${text}`);
    const watch = (page: Page) => {
      // A script that did not load gives a page error with no text: the failed request's line names it.
      page.on("pageerror", e => log(`page error: ${e.stack || e.message || e.name}`));
      page.on("console", m => { if (m.type() === "error") log(`console error: ${m.text()} (${m.location().url})`); });
      page.on("requestfailed", r => log(`request failed: ${r.method()} ${r.url()}: ${r.failure()?.errorText}`));
      page.on("response", r => { if (r.status() >= 400) log(`HTTP ${r.status()}: ${r.request().method()} ${r.url()}`); });
      page.on("crash", () => log("the page crashed"));
    };
    context.pages().forEach(watch);
    context.on("page", watch);
    await use(lines);
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach("page-log", { body: lines.join("\n") || "(nothing)", contentType: "text/plain" });
    }
  }, { auto: true }],
});
