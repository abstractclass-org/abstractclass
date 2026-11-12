// Checks the partners' code with a site's parts (partners.ts): which addresses count as a partner's save page, the
// partners' test switch, and the window messages, which carry the site's name. Each site keeps a test of its own list
// (Hedge School's src/lib/game/partners.test.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROTOCOL, partnerSite, type PartnerSite } from "./partners.ts";

const PARTNERS = [{ name: "partner.example", hosts: ["partner.example", "www.partner.example"] }];
const SITE: PartnerSite = { messages: "site-here", name: "The Site", partners: PARTNERS, test: false };

test("a save page counts only on a partner's own host, over https", () => {
  const { partnerOf, gamePartner } = partnerSite(SITE);
  assert.equal(partnerOf("https://www.partner.example/review/save?game=1")?.name, "partner.example");
  assert.equal(partnerOf("https://partner.example/save")?.name, "partner.example");
  assert.equal(partnerOf("http://www.partner.example/save"), null); // not https
  assert.equal(partnerOf("https://partner.example.example.net/save"), null); // another host
  assert.equal(partnerOf("https://example.com/?u=https://www.partner.example/"), null);
  assert.equal(partnerOf("javascript:alert(1)"), null);
  assert.equal(partnerOf("not an address"), null);
  assert.equal(partnerOf("http://127.0.0.1:5173/save"), null); // no test site unless the site turns it on
  assert.deepEqual(gamePartner("https://www.partner.example/s"), { name: "partner.example", save: "https://www.partner.example/s" });
  assert.equal(gamePartner(null), null);
  assert.equal(gamePartner("https://example.com/s"), null);
  assert.equal(partnerSite({ ...SITE, partners: [] }).partnerOf("https://partner.example/save"), null); // an empty list
});

test("the partners' test counts the developer's own computer, over http too", () => {
  const { partnerOf, gamePartner } = partnerSite({ ...SITE, test: true });
  assert.equal(partnerOf("http://127.0.0.1:5173/save")?.name, "the local test site");
  assert.equal(partnerOf("https://localhost/save")?.name, "the local test site");
  assert.equal(partnerOf("ftp://localhost/save"), null);
  assert.equal(partnerOf("https://partner.example/save")?.name, "partner.example"); // the list still counts
  assert.deepEqual(gamePartner("http://localhost:4000/s"), { name: "the local test site", save: "http://localhost:4000/s" });
});

/** A page's window, enough for the partners' messages: its listeners, what it posts to its opener or to the page it
 *  opened, and the message from another page. */
function fakeWindow(opener: object | null = null) {
  const listeners = new Set<(event: unknown) => unknown>();
  const posted: { to: string; data: Record<string, unknown>; origin: string }[] = [];
  const page = (to: string) => ({ postMessage: (data: Record<string, unknown>, origin: string) => posted.push({ to, data, origin }) });
  const opened = page("opened");
  const win = {
    opener: opener && Object.assign(opener, page("opener")),
    opened: [] as string[],
    open: (url: string) => { win.opened.push(url); return opened; },
    addEventListener: (_: string, f: (event: unknown) => unknown) => listeners.add(f),
    removeEventListener: (_: string, f: (event: unknown) => unknown) => listeners.delete(f),
  };
  /** A message from `source` on `origin`, after the listeners have run. */
  const receive = async (source: unknown, origin: string, data: unknown) => {
    for (const f of [...listeners]) await f({ source, origin, data });
  };
  return { win, opened, posted, receive, listening: () => listeners.size };
}

/** Runs `run` with `fake` as the page's window. */
async function withWindow<T>(fake: ReturnType<typeof fakeWindow>, run: () => Promise<T>): Promise<T> {
  const before = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = fake.win;
  try { return await run(); } finally { (globalThis as { window?: unknown }).window = before; }
}

test("Save to: the save page opens, gets the review once ready, in the site's messages, and its answer ends it", async () => {
  const { saveToPartner } = partnerSite(SITE);
  const fake = fakeWindow(), partner = { name: "partner.example", save: "https://www.partner.example/save?game=1" };
  const target = "https://www.partner.example";
  await withWindow(fake, async () => {
    const saving = saveToPartner(partner, Promise.resolve({ name: "game.json", review: { format: "x" } }));
    assert.deepEqual(fake.win.opened, [partner.save]);
    await fake.receive(fake.opened, "https://partner.example", { type: "site-here:ready" }); // another origin
    await fake.receive({}, target, { type: "site-here:ready" }); // another page
    await fake.receive(fake.opened, target, { type: "hedge-school:ready" }); // another site's message
    assert.deepEqual(fake.posted, []);
    await fake.receive(fake.opened, target, { type: "site-here:ready" });
    assert.deepEqual(fake.posted, [{ to: "opened", origin: target,
      data: { type: "site-here:review", protocol: PROTOCOL, name: "game.json", review: { format: "x" } } }]);
    await fake.receive(fake.opened, target, { type: "site-here:saved" });
    await saving;
    assert.equal(fake.listening(), 0);
  });
  const failing = fakeWindow();
  await withWindow(failing, async () => {
    const saving = saveToPartner(partner, Promise.resolve({ name: "game.json", review: {} }));
    await failing.receive(failing.opened, target, { type: "site-here:failed", message: "sign in first" });
    await assert.rejects(saving, { message: "partner.example: sign in first" });
  });
  const blocked = fakeWindow();
  Object.assign(blocked.win, { open: () => null }); // the browser refused the pop-up
  await withWindow(blocked, () =>
    assert.rejects(saveToPartner(partner, Promise.resolve({ name: "", review: {} })),
                   { message: "the browser did not open partner.example: allow this site's pop-ups" }));
});

test("a kept review: the page asks its opener in the site's messages, loads the file and keeps the save page", async () => {
  const { receiveKeptReview } = partnerSite(SITE);
  const opener = {}, fake = fakeWindow(opener), from = "https://www.partner.example";
  const waited: string[] = [], loaded: string[] = [], kept: unknown[] = [];
  const steps = {
    waiting: (sender: string) => { waited.push(sender); },
    load: async (text: string) => { loaded.push(text); return { id: "abc", text }; },
    keep: async (id: string, partner: unknown) => { kept.push([id, partner]); },
  };
  await withWindow(fake, async () => {
    const receiving = receiveKeptReview(from, "https://www.partner.example/save", steps);
    assert.deepEqual(fake.posted, [{ to: "opener", origin: from, data: { type: "site-here:ready", protocol: PROTOCOL } }]);
    assert.deepEqual(waited, ["partner.example"]);
    await fake.receive(opener, from, { type: "hedge-school:review", review: { no: 1 } }); // another site's message
    await fake.receive(opener, from, { type: "site-here:review", review: { format: "x" } });
    assert.deepEqual(await receiving, { id: "abc", text: '{"format":"x"}' });
    assert.deepEqual(kept, [["abc", { name: "partner.example", save: "https://www.partner.example/save" }]]);
  });
  await withWindow(fake, () => assert.rejects(receiveKeptReview("https://example.com", null, steps),
                                              { message: "the link names a site that is not one of The Site's partners" }));
  await withWindow(fakeWindow(), () => assert.rejects(receiveKeptReview(from, null, steps),
    { message: "partner.example's page is gone, or did not let this page answer it. Open the review again from partner.example." }));
  assert.deepEqual(loaded, ['{"format":"x"}']);
});
