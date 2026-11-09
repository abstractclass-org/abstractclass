// PostHog's part of the browser tests, for both sites' builds of check:all, which have a made-up PostHog key
// (scripts/check-all.mjs). No request reaches PostHog: the browser resolves none of its addresses
// (playwright.config.ts), and here Playwright's route answers them in PostHog's place, and keeps what the pages sent.
// The route is the context's, so it keeps the events of every page of the context and across the pages' loads.
// As a page goes, PostHog's client sends the events that it still holds by `navigator.sendBeacon`, which neither
// Playwright's route nor its events see (Chromium's CDP does not report it either). keepBeacons keeps those in the
// page, and withBeacons adds them.
import { gunzipSync } from "node:zlib";
import { test, type BrowserContext, type Page } from "@playwright/test";

export const POSTHOG = /(^|\.)posthog\.com$/;

/** An event that a page sent to PostHog, with its request's path. */
export interface Sent { path: string; uuid: string; event: string; properties: Record<string, unknown> }

/** A desktop Chrome's name, as a visitor's browser gives it. */
const VISITOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

/** posthog-js sends nothing from a browser that looks like a bot (its isLikelyBot): a name or a brand that says
 *  "HeadlessChrome", or `navigator.webdriver`, which Playwright sets. A test file that reads the events calls this at
 *  its top: its pages take a desktop Chrome's name, no brands and no webdriver flag, as a visitor's browser has. The
 *  page's script reads the name from the page too: as a page goes (`pagehide`), Playwright's name for the browser no
 *  longer holds, and PostHog dropped the page leave and every event that it still held. */
export function lookLikeAVisitor() {
  test.use({ userAgent: VISITOR });
  test.beforeEach(({ context }) => context.addInitScript(name => {
    Object.defineProperty(Navigator.prototype, "userAgent", { get: () => name });
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  }, VISITOR));
}

/** A body that posthog-js sent: gzip, or a form's `data=` with base64 or plain JSON, or plain JSON. */
function decode(body: Buffer): unknown[] {
  let text = body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body).toString("utf8") : body.toString("utf8");
  if (text.startsWith("data=")) {
    text = decodeURIComponent(text.slice(5));
    if (!text.trimStart().startsWith("{") && !text.trimStart().startsWith("[")) text = Buffer.from(text, "base64").toString("utf8");
  }
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : json.batch ?? [json];
}

/** The events of a body that posthog-js sent to `path`. */
function events(path: string, body: Buffer): Sent[] {
  return decode(body).map(e => {
    const { uuid, event, properties } = e as { uuid: string; event: string; properties: Record<string, unknown> };
    return { path, uuid, event, properties };
  });
}

/** Answers every request to PostHog in PostHog's place, and returns the events that the pages sent, with each
 *  request's path. */
export async function answerPostHog(context: BrowserContext): Promise<Sent[]> {
  const sent: Sent[] = [];
  await context.route(url => POSTHOG.test(url.hostname), async (route, request) => {
    const path = new URL(request.url()).pathname;
    const body = request.postDataBuffer();
    if (body) sent.push(...events(path, body));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: 1 }) });
  });
  return sent;
}

/** The properties that PostHog's client adds to every event: its own (`$…`), the project's key and the visitor's id,
 *  and the site's properties of the page (the visitor's `games_stored`, and `internal`). */
const ADDED = new Set(["token", "distinct_id", "games_stored", "internal"]);

/** The site's own parameters of each event named `name` that the pages sent so far, in their order. */
export const named = (sent: Sent[], name: string) => sent.filter(e => e.event === name).map(e =>
  Object.fromEntries(Object.entries(e.properties).filter(([k]) => !k.startsWith("$") && !ADDED.has(k))));

/** The key in the tab's session storage where keepBeacons keeps the beacons' bodies. */
const BEACONS = "test:posthog-beacons";

/** Keeps each body that a page gives PostHog by `navigator.sendBeacon`, as it goes, in the tab's session storage, which
 *  the site's next page in the tab reads (withBeacons). posthog-js gives the beacon a Blob, which a page cannot read at
 *  once: the pages' Blob keeps the parts that each Blob was made of. */
export async function keepBeacons(context: BrowserContext) {
  await context.addInitScript(key => {
    const parts = new WeakMap<Blob, BlobPart[]>();
    const NativeBlob = window.Blob;
    window.Blob = class extends NativeBlob {
      constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
        super(blobParts, options);
        if (blobParts) parts.set(this, blobParts);
      }
    };
    const bytes = (part: unknown): number[] =>
      typeof part === "string" ? [...new TextEncoder().encode(part)]
      : part instanceof ArrayBuffer ? [...new Uint8Array(part)]
      : ArrayBuffer.isView(part) ? [...new Uint8Array(part.buffer, part.byteOffset, part.byteLength)]
      : part instanceof NativeBlob ? (parts.get(part) ?? []).flatMap(bytes)
      : [];
    const send = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => {
      if (/^https:\/\/[^/]*posthog\.com\//.test(String(url))) {
        const kept = JSON.parse(sessionStorage.getItem(key) ?? "[]") as { path: string; body: string }[];
        kept.push({ path: new URL(url).pathname, body: btoa(String.fromCharCode(...bytes(data))) });
        sessionStorage.setItem(key, JSON.stringify(kept));
      }
      return send(url, data);
    };
  }, BEACONS);
}

/** The events that the pages sent: `sent`, which the route kept, with the beacons that keepBeacons kept in the tab of
 *  `page`, which must show a page of the site. Each event once, by its id. */
export async function withBeacons(page: Page, sent: Sent[]): Promise<Sent[]> {
  const kept = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? "[]"), BEACONS) as
    { path: string; body: string }[];
  const all = [...sent, ...kept.flatMap(b => events(b.path, Buffer.from(b.body, "base64")))];
  return all.filter((e, i) => all.findIndex(f => f.uuid === e.uuid) === i);
}
