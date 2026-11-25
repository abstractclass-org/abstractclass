// Checks the request for a short link of PTN Ninja (shortLink.ts). The answers have the form that PTN Ninja's source gives
// (its functions/index.js, `short`), and a fake request takes the place of its shortener. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shortRecord } from "./shortLink.ts";

const FAILED = "The site could not get the game from PTN Ninja. Paste the PTN of the game, or try again later.";
const PTN = '[Size "6"]\n\n1. a1 f6\n';
const answer = (status: number, body: BodyInit | null) =>
  (async () => new Response(body, { status })) as unknown as typeof fetch;
const problem = async (request: typeof fetch) => {
  try { await shortRecord("abc123", request); } catch (e) { return (e as Error).message; }
  assert.fail("taken");
};

test("the request holds the id alone, with no cookies, no page's address and no cache", async () => {
  const asked: [string, RequestInit][] = [];
  const request = (async (address: string, init: RequestInit) => {
    asked.push([address, init]);
    return new Response(JSON.stringify({ ptn: PTN, params: {}, visits: 3 }));
  }) as unknown as typeof fetch;
  assert.equal(await shortRecord("0a1b2c", request), PTN);
  const [[address, { signal, ...rest }]] = asked;
  assert.equal(address, "https://url.ptn.ninja/short?id=0a1b2c");
  assert.ok(signal instanceof AbortSignal);
  assert.deepEqual(rest, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", cache: "no-store" });
});

test("a link that PTN Ninja does not have", async () => {
  assert.equal(await problem(answer(400, '{"message":"URL alias not found"}')),
               "PTN Ninja has no game for this short link. A short link that no one opens expires.");
});

test("an answer that is not a game", async () => {
  const answers: [number, string][] = [[400, '{"message":"Invalid request"}'], [500, ""], [200, ""], [200, "<!doctype html>"],
    [200, "null"], [200, "[]"], [200, "{}"], [200, '{"ptn":7}'], [200, '{"ptn":" "}'], [200, '"text"'],
    [500, JSON.stringify({ ptn: PTN })]];
  for (const [status, body] of answers) assert.equal(await problem(answer(status, body)), FAILED, `${status} ${body}`);
  assert.equal(await problem((async () => { throw new TypeError("no connection"); }) as unknown as typeof fetch), FAILED);
});

test("an answer over the limit is not read to its end", async () => {
  let given = 0, stopped = false;
  const endless = new ReadableStream<Uint8Array>({
    pull(c) { given += 65536; c.enqueue(new Uint8Array(65536).fill(32)); },
    cancel() { stopped = true; },
  });
  assert.equal(await problem(answer(200, endless)), "The game in this short link is too long for the site.");
  assert.ok(stopped);
  assert.ok(given < 2 ** 21, String(given));
});
