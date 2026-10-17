// Checks that the page fetches a network and checks its SHA-256 once for all its workers (checked), and that a file
// whose SHA-256 is not the manifest's reaches no worker. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { bytesOf } from "./artifacts.ts";
import { checked } from "./client.ts";

const FILE = new TextEncoder().encode("a network's bytes");
const SHA = createHash("sha256").update(FILE).digest("hex");

/** Serves `body` for every fetch, and counts the fetches. */
function serve(body: Uint8Array) {
  const served = { fetches: 0 };
  globalThis.fetch = (async () => {
    served.fetches++;
    return new Response(body as BodyInit);
  }) as typeof fetch;
  return served;
}

test("the page fetches and checks a network once for all its workers", async () => {
  const served = serve(FILE);
  const a = { url: "/engine/once/model.bin", sha256: SHA, bytes: FILE.length };
  const [first, second] = await Promise.all([checked(a), checked(a)]);
  const third = await checked(a);
  assert.equal(served.fetches, 1);
  for (const blob of [first, second, third]) assert.deepEqual(await bytesOf(blob), FILE);
});

test("a network whose SHA-256 is not the manifest's reaches no worker, and the next start fetches it again", async () => {
  serve(new TextEncoder().encode("other bytes"));
  const a = { url: "/engine/wrong/model.bin", sha256: SHA, bytes: FILE.length };
  await assert.rejects(checked(a), /SHA-256 .* is not the manifest's/);
  const again = serve(FILE);
  assert.deepEqual(await bytesOf(await checked(a)), FILE);
  assert.equal(again.fetches, 1);
});
