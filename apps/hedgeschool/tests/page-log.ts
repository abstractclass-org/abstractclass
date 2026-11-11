// Playwright's test with the page log: each page error, console error, failed request, HTTP error and page crash in
// the browser's contexts while the case runs, with the time since the case started. A case that fails gets the log as
// the file page-log.txt in its folder of test-results, which keeps it after the run, so that a failure that happens
// only under load keeps its evidence (abscls-z0jz). A case that passes writes nothing. A spec file takes it in place of
// @playwright/test's own: `import { expect, test } from "./page-log.ts"`. `npm run check:all` refuses a spec that does
// not (scripts/spec-page-log.mjs). The log reads the case's own context, a context that the case makes
// (browser.newContext, browser.newPage) and a context that a beforeAll made for its file's cases. What a beforeAll
// does before the first case starts is not in the log. Playwright's trace keeps the same events, but it also writes
// each response's body, the engine's files too, for every case.
import { writeFile } from "node:fs/promises";
import { test as base, type BrowserContext, type ConsoleMessage, type Page, type Request, type Response,
  type WebError } from "@playwright/test";

export { expect } from "@playwright/test";
export type { BrowserContext, Locator, Page, Request } from "@playwright/test";

export const test = base.extend<{ pageLog: void }>({
  pageLog: [async ({ browser, context }, use, testInfo) => {
    const lines: string[] = [], start = Date.now();
    const log = (text: string) => lines.push(`${((Date.now() - start) / 1000).toFixed(1)} s  ${text}`);
    // A script that did not load gives a page error with no text: the failed request's line names it.
    const onError = (e: WebError) => log(`page error: ${e.error().stack || e.error().message || e.error().name}`);
    const onConsole = (m: ConsoleMessage) => {
      if (m.type() === "error") log(`console error: ${m.text()} (${m.location().url})`);
    };
    const onFailed = (r: Request) => log(`request failed: ${r.method()} ${r.url()}: ${r.failure()?.errorText}`);
    const onResponse = (r: Response) => {
      if (r.status() >= 400) log(`HTTP ${r.status()}: ${r.request().method()} ${r.url()}`);
    };
    const onCrash = () => log("the page crashed");
    const onPage = (page: Page) => page.on("crash", onCrash);
    const read = new Set<BrowserContext>();
    const readContext = (c: BrowserContext) => {
      if (read.has(c)) return;
      read.add(c);
      c.on("weberror", onError).on("console", onConsole).on("requestfailed", onFailed).on("response", onResponse)
        .on("page", onPage);
      c.pages().forEach(onPage);
    };
    // The case's own context, each other context open now (a beforeAll's), and each one that opens during the case
    readContext(context);
    browser.contexts().forEach(readContext);
    browser.on("context", readContext);
    await use();
    // The listeners go with the case: a beforeAll's context stays for the next case, which logs on its own
    browser.off("context", readContext);
    for (const c of read) {
      c.off("weberror", onError).off("console", onConsole).off("requestfailed", onFailed).off("response", onResponse)
        .off("page", onPage);
      for (const page of c.pages()) page.off("crash", onCrash);
    }
    if (testInfo.status !== testInfo.expectedStatus) {
      // A file, not an attachment's body: Playwright writes no body to test-results, and its list cuts it short.
      const path = testInfo.outputPath("page-log.txt");
      await writeFile(path, lines.join("\n") || "(nothing)");
      await testInfo.attach("page-log", { path, contentType: "text/plain" });
    }
  }, { auto: true }],
});
