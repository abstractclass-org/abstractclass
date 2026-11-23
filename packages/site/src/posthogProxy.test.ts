// Checks the proxy of PostHog's requests (posthogProxy.ts): the hosts, the path and the headers that it forwards.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { POSTHOG_PATH, posthogProxy, posthogTarget, type ProxyDeps } from "./posthogProxy.ts";

const SITE = "https://hedgeschool.abstractclass.org";

/** A proxy whose fetch keeps each request and answers `answer`, with a cache of its own when `withCache`. */
function proxy(answer = () => new Response("ok"), withCache = false) {
  const fetched: Request[] = [];
  const stored = new Map<string, Response>();
  const waits: Promise<unknown>[] = [];
  const cache = {
    match: async (r: Request) => stored.get(r.url)?.clone(),
    put: async (r: Request, res: Response) => { stored.set(r.url, res); },
  };
  const deps: ProxyDeps = {
    fetch: async request => { fetched.push(request); return answer(); },
    cache: () => withCache ? cache as unknown as Pick<Cache, "match" | "put"> : undefined,
  };
  const handle = posthogProxy(deps);
  const call = (request: Request) => handle({ request, waitUntil: p => { waits.push(p); } });
  return { fetched, stored, waits, call };
}

test("the path is no word that a blocker's list catches, and events go to the events' host with their query", () => {
  assert.doesNotMatch(POSTHOG_PATH, /posthog|analytic|track|telemetry|ingest|ph\b/i);
  assert.equal(posthogTarget(new URL(`${SITE}${POSTHOG_PATH}/e/?compression=gzip-js&ver=1.2`))?.href,
               "https://us.i.posthog.com/e/?compression=gzip-js&ver=1.2");
  assert.equal(posthogTarget(new URL(`${SITE}${POSTHOG_PATH}/i/v0/e/`))?.href, "https://us.i.posthog.com/i/v0/e/");
  assert.equal(posthogTarget(new URL(`${SITE}${POSTHOG_PATH}/flags/?v=2`))?.href,
               "https://us.i.posthog.com/flags/?v=2");
});

test("/static/ and /array/ go to the assets' host, with their query, as the guide's Worker sends them", () => {
  assert.equal(posthogTarget(new URL(`${SITE}${POSTHOG_PATH}/static/surveys.js?v=1.447.4`))?.href,
               "https://us-assets.i.posthog.com/static/surveys.js?v=1.447.4");
  assert.equal(posthogTarget(new URL(`${SITE}${POSTHOG_PATH}/array/phc_x/config.js`))?.href,
               "https://us-assets.i.posthog.com/array/phc_x/config.js");
});

test("a path outside the proxy's, or one that only starts with its word, goes nowhere", async () => {
  for (const path of ["/", "/api/practice-games", POSTHOG_PATH, `${POSTHOG_PATH}x/e/`, `/static${POSTHOG_PATH}/e/`]) {
    assert.equal(posthogTarget(new URL(`${SITE}${path}`)), null, path);
  }
  const { fetched, call } = proxy();
  assert.equal((await call(new Request(`${SITE}/about`))).status, 404);
  assert.equal(fetched.length, 0);
});

test("an event: its method and body as they came, the browser's IP address, no cookie or credential", async () => {
  const { fetched, call } = proxy(() => new Response('{"status":1}', { status: 200 }));
  const body = new Uint8Array([0x1f, 0x8b, 1, 2, 3]);
  const response = await call(new Request(`${SITE}${POSTHOG_PATH}/e/?compression=gzip-js`, {
    method: "POST",
    body,
    headers: {
      "content-type": "text/plain",
      "user-agent": "Mozilla/5.0 test",
      cookie: "hedge=1; other=2",
      authorization: "Basic dXNlcjpwYXNz",
      "CF-Connecting-IP": "203.0.113.7",
      "X-Forwarded-For": "198.51.100.1, 203.0.113.7",
    },
  }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"status":1}');
  assert.equal(fetched.length, 1);
  const sent = fetched[0];
  assert.equal(sent.url, "https://us.i.posthog.com/e/?compression=gzip-js");
  assert.equal(sent.method, "POST");
  assert.deepEqual(new Uint8Array(await sent.arrayBuffer()), body);
  assert.equal(sent.headers.get("cookie"), null);
  assert.equal(sent.headers.get("authorization"), null);
  assert.equal(sent.headers.get("x-forwarded-for"), "203.0.113.7");
  assert.equal(sent.headers.get("user-agent"), "Mozilla/5.0 test");
  assert.equal(sent.headers.get("content-type"), "text/plain");
});

test("a PostHog key in Authorization goes on, and a request without CF-Connecting-IP names no address", async () => {
  const { fetched, call } = proxy();
  await call(new Request(`${SITE}${POSTHOG_PATH}/i/v0/e/`, {
    method: "POST", body: "{}", headers: { authorization: "Bearer phc_TEST0000" },
  }));
  assert.equal(fetched[0].headers.get("authorization"), "Bearer phc_TEST0000");
  assert.equal(fetched[0].headers.get("x-forwarded-for"), "");
});

test("a GET goes on with no body", async () => {
  const { fetched, call } = proxy();
  await call(new Request(`${SITE}${POSTHOG_PATH}/flags/?v=2`));
  assert.equal(fetched[0].method, "GET");
  assert.equal(fetched[0].body, null);
});

test("an asset comes from PostHog once, then from the cache, with no header of the browser's", async () => {
  const answer = () => new Response("asset", { headers: { "cache-control": "max-age=60" } });
  const { fetched, waits, call } = proxy(answer, true);
  const request = () => new Request(`${SITE}${POSTHOG_PATH}/static/array.js`, { headers: { cookie: "hedge=1" } });
  assert.equal(await (await call(request())).text(), "asset");
  await Promise.all(waits);
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].url, "https://us-assets.i.posthog.com/static/array.js");
  assert.equal(fetched[0].headers.get("cookie"), null);
  const again = await call(request());
  assert.equal(await again.text(), "asset");
  assert.equal(again.headers.get("cache-control"), "max-age=60");
  assert.equal(fetched.length, 1);
});

test("without Cloudflare's cache (a test, or an address with none), an asset still comes from PostHog", async () => {
  const { fetched, waits, call } = proxy(() => new Response("asset"));
  assert.equal(await (await call(new Request(`${SITE}${POSTHOG_PATH}/static/array.js`))).text(), "asset");
  assert.equal(fetched.length, 1);
  assert.equal(waits.length, 0);
});

// Pages takes a Function's path from its folder, and runs it only on the paths of static/_routes.json. The browser
// tests answer POSTHOG_PATH in the Function's place, so a path that the folder or the routes no longer match would
// lose the live sites' events with no failed test.
test("each site of this package has its Function on POSTHOG_PATH, and routes the path to it", () => {
  const apps = new URL("../../../apps/", import.meta.url);
  const sites = readdirSync(apps).filter(app => {
    const pkg = new URL(`${app}/package.json`, apps);
    return existsSync(pkg) && "@abstractclass/site" in (JSON.parse(readFileSync(pkg, "utf8")).dependencies ?? {});
  });
  assert.deepEqual(sites.sort(), ["cyanotype", "hedgeschool", "mistak"]);
  for (const site of sites) {
    const fn = readFileSync(new URL(`${site}/functions${POSTHOG_PATH}/[[path]].ts`, apps), "utf8");
    assert.match(fn, /export const onRequest = posthogProxy\(\);/, site);
    const routes = JSON.parse(readFileSync(new URL(`${site}/static/_routes.json`, apps), "utf8"));
    assert.ok(routes.include.includes(`${POSTHOG_PATH}/*`), site);
  }
});
