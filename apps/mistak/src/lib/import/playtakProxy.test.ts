// Checks the proxy of playtak's games (playtakProxy.ts): a fake fetch takes the place of playtak, and the cache and the
// waits are the test's. The records and the numbers are ours: no request leaves this machine. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLAYTAK_PATH, playtakProxy, type PlaytakDeps } from "./playtakProxy.ts";

const PTN = '[Size "6"]\n\n1. a1 f6 *\n';
const SITE = "https://mistak.example";

const text = (body: string, status = 200, type = "text/plain; charset=utf-8") =>
  new Response(body, { status, headers: { "Content-Type": type } });

/** A proxy whose fetch answers each request in turn with the next of `answers`. It keeps the requests, the waits and
 *  the cache, which starts with `cached`. */
function setUp(answers: (Response | Error | "hang")[], cached: Record<string, Response> = {}) {
  const sent: Request[] = [], waits: number[] = [], kept = new Map(Object.entries(cached)), pending: Promise<unknown>[] = [];
  const address = (key: RequestInfo | URL) => (key as Request).url;
  const deps: PlaytakDeps = {
    fetch: async request => {
      sent.push(request);
      const next = answers.shift();
      if (next === undefined) assert.fail("one request too many");
      if (next === "hang")
        return new Promise((_, refuse) => request.signal.addEventListener("abort", () => refuse(request.signal.reason)));
      if (next instanceof Error) throw next;
      return next;
    },
    cache: () => ({
      match: async (key: RequestInfo | URL) => kept.get(address(key))?.clone(),
      put: async (key: RequestInfo | URL, response: Response) => { kept.set(address(key), response); },
    }),
    wait: async ms => { waits.push(ms); },
    timeout: 20,
  };
  const call = async (path: string, init: RequestInit = {}) => {
    const response = await playtakProxy(deps)({ request: new Request(SITE + path, init), waitUntil: p => pending.push(p) });
    await Promise.all(pending);
    return response;
  };
  return { call, sent, waits, kept };
}

test("a game's PTN comes back as text, and is kept for a day", async () => {
  const { call, sent, kept } = setUp([text(PTN)]);
  const response = await call(`${PLAYTAK_PATH}123`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), PTN);
  assert.equal(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=86400");
  assert.deepEqual([...response.headers.keys()].filter(h => h.startsWith("access-control")), []);
  assert.equal(sent[0].url, "https://api.playtak.com/v1/games-history/ptn/123");
  assert.deepEqual([...kept.keys()], [`${SITE}${PLAYTAK_PATH}123`]);
});

test("the request to playtak has none of the browser's headers, and names Mistak", async () => {
  const { call, sent } = setUp([text(PTN)]);
  await call(`${PLAYTAK_PATH}123`, { headers: {
    Authorization: "Bearer x", "Accept-Language": "en", "User-Agent": "Browser", "X-Own": "1" } });
  assert.deepEqual(Object.fromEntries(sent[0].headers),
                   { accept: "text/plain", "user-agent": "Mistak (https://mistak.abstractclass.org)" });
  assert.equal(sent[0].method, "GET");
});

test("a kept game asks playtak nothing, whatever query its address has", async () => {
  const { call, sent } = setUp([], { [`${SITE}${PLAYTAK_PATH}123`]: text(PTN) });
  assert.equal(await (await call(`${PLAYTAK_PATH}123?x=1`)).text(), PTN);
  assert.equal(sent.length, 0);
});

test("the address's query does not reach playtak", async () => {
  const { call, sent, kept } = setUp([text(PTN)]);
  await call(`${PLAYTAK_PATH}123?limit=1&id=4#x`);
  assert.equal(sent[0].url, "https://api.playtak.com/v1/games-history/ptn/123");
  assert.deepEqual([...kept.keys()], [`${SITE}${PLAYTAK_PATH}123`]);
});

test("every other path is not found, and asks playtak nothing", async () => {
  const { call, sent } = setUp([]);
  for (const path of [PLAYTAK_PATH, `${PLAYTAK_PATH}abc`, `${PLAYTAK_PATH}12a`, `${PLAYTAK_PATH}12/34`, `${PLAYTAK_PATH}-1`,
                      `${PLAYTAK_PATH}012`, `${PLAYTAK_PATH}0`, `${PLAYTAK_PATH}12345678901`, `${PLAYTAK_PATH}%31`,
                      `${PLAYTAK_PATH}../1`, "/api/playtak/", "/api/playtak/games/1", "/api/other/ptn/1",
                      `${PLAYTAK_PATH}1%2f..%2f..`, `${PLAYTAK_PATH}1%2F2`, `${PLAYTAK_PATH}%2e%2e/1`, `${PLAYTAK_PATH}1%00`,
                      `${PLAYTAK_PATH}1%0a`, `${PLAYTAK_PATH}1%3flimit=1`, `${PLAYTAK_PATH}1;x`, `${PLAYTAK_PATH}/1`,
                      `${PLAYTAK_PATH}1/`, `${PLAYTAK_PATH}1\\2`, `${PLAYTAK_PATH}１２`, `${PLAYTAK_PATH}%EF%BC%91`,
                      `${PLAYTAK_PATH}1e3`, `${PLAYTAK_PATH}0x1`, `${PLAYTAK_PATH}+1`, `${PLAYTAK_PATH}1.0`,
                      `${PLAYTAK_PATH}${"9".repeat(400)}`, `/x${PLAYTAK_PATH}1`, `/${PLAYTAK_PATH}1`,
                      PLAYTAK_PATH.toUpperCase() + "1"])
    assert.equal((await call(path)).status, 404, path);
  assert.equal(sent.length, 0);
});

test("every other method is refused, and asks playtak nothing", async () => {
  const { call, sent } = setUp([]);
  for (const method of ["POST", "PUT", "DELETE", "HEAD", "OPTIONS"]) {
    const response = await call(`${PLAYTAK_PATH}123`, { method });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("Allow"), "GET");
  }
  assert.equal(sent.length, 0);
});

test("a number with no game passes playtak's 404 back, and is not kept", async () => {
  const { call, kept } = setUp([text('{"statusCode":404}', 404, "application/json; charset=utf-8")]);
  const response = await call(`${PLAYTAK_PATH}123`);
  assert.equal(response.status, 404);
  assert.equal(await response.text(), '{"statusCode":404}');
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(kept.size, 0);
});

test("playtak's faults, its redirects, no connection and a timeout answer 502, and nothing is kept", async () => {
  for (const answer of [text("x", 500), text("x", 503),
                        new Response(null, { status: 302, headers: { Location: "https://example.org/" } }),
                        new TypeError("no connection"), "hang"] as const) {
    const { call, sent, kept } = setUp([answer]);
    assert.equal((await call(`${PLAYTAK_PATH}123`)).status, 502, String(answer));
    assert.equal(sent.length, 1);
    assert.equal(kept.size, 0);
  }
});

test("a status 429 is tried once again after one second", async () => {
  const { call, sent, waits } = setUp([text("x", 429), text(PTN)]);
  const response = await call(`${PLAYTAK_PATH}123`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), PTN);
  assert.deepEqual(waits, [1000]);
  assert.equal(sent.length, 2);
});

test("a second status 429 answers 502", async () => {
  const { call, sent, kept } = setUp([text("x", 429), text("x", 429)]);
  assert.equal((await call(`${PLAYTAK_PATH}123`)).status, 502);
  assert.equal(sent.length, 2);
  assert.equal(kept.size, 0);
});

test("an answer 200 that is not text is no game: it answers 502, and is not kept", async () => {
  for (const type of ["text/html", "application/json; charset=utf-8", "text/plain, text/html", "text/plainer", ""]) {
    const { call, kept } = setUp([text("<script>1</script>", 200, type)]);
    const response = await call(`${PLAYTAK_PATH}123`);
    assert.equal(response.status, 502, type);
    assert.equal(await response.text(), "");
    assert.equal(kept.size, 0);
  }
});

test("another answer that calls itself a page comes back as text", async () => {
  for (const type of ["text/html", "text/plain, text/html", "text/plain;,text/html", "text/plain; charset=utf-16", ""]) {
    const { call } = setUp([text("<script>1</script>", 404, type)]);
    const response = await call(`${PLAYTAK_PATH}123`);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("Content-Type"), "text/plain; charset=utf-8", type);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  }
});

test("an answer comes back with none of playtak's headers", async () => {
  const { call } = setUp([new Response(PTN, { headers: {
    "Content-Type": "text/plain", "Set-Cookie": "a=b", "Access-Control-Allow-Origin": "*", "X-Own": "1" } })]);
  assert.deepEqual([...(await call(`${PLAYTAK_PATH}123`)).headers.keys()],
                   ["cache-control", "content-type", "x-content-type-options"]);
});

test("an answer over 1 MiB is not read to its end, answers 502 and is not kept", async () => {
  let given = 0, stopped = false;
  const endless = new ReadableStream<Uint8Array>({
    pull(c) { given += 65536; c.enqueue(new Uint8Array(65536).fill(32)); },
    cancel() { stopped = true; },
  });
  const { call, kept } = setUp([new Response(endless, { headers: { "Content-Type": "text/plain" } })]);
  assert.equal((await call(`${PLAYTAK_PATH}123`)).status, 502);
  assert.ok(stopped);
  assert.ok(given < 2 ** 21, String(given));
  assert.equal(kept.size, 0);
});

test("without a cache the proxy answers all the same", async () => {
  const proxy = playtakProxy({ fetch: async () => text(PTN), cache: () => undefined, wait: async () => {}, timeout: 20 });
  const response = await proxy({ request: new Request(`${SITE}${PLAYTAK_PATH}123`), waitUntil: () => {} });
  assert.equal(await response.text(), PTN);
});

test("Cloudflare runs the Function for its path", () => {
  const file = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
  const routes = JSON.parse(file("static/_routes.json")) as { include: string[] };
  assert.ok(routes.include.includes("/api/*"));
  assert.match(file("functions/api/playtak/[[path]].ts"), /export const onRequest = playtakProxy\(\);/);
});
