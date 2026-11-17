// Checks the retry rule of the engine step's downloads (download.ts): a transient failure (an HTTP 5xx, a body that
// stops before its Content-Length, a connection reset) gets another try after a wait, a 404 fails at once, and a
// whole body comes back as it is, after one request. A stub server on this machine stands for GitHub. It answers with raw bytes, so that
// Node's fetch meets a cut body as it meets one from the network. The waits are recorded, not waited. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Socket } from "node:net";
import { downloadRetrying } from "./download.ts";

const FILE = Buffer.from("the engine's file");

type Answer = "file" | "wrong" | "504" | "404" | "cut" | "reset";

/** Writes one HTTP answer on the socket and closes it. */
function answer(socket: Socket, kind: Answer) {
  const head = (status: string, length: number) =>
    `HTTP/1.1 ${status}\r\nContent-Length: ${length}\r\nConnection: close\r\n\r\n`;
  if (kind === "reset") return socket.destroy();
  if (kind === "504") return socket.end(head("504 Gateway Timeout", 0));
  if (kind === "404") return socket.end(head("404 Not Found", 9) + "Not Found");
  if (kind === "wrong") return socket.end(head("200 OK", 5) + "wrong");
  // A body that stops before its Content-Length: Node's fetch fails with UND_ERR_RES_CONTENT_LENGTH_MISMATCH.
  if (kind === "cut") return socket.end(Buffer.concat([Buffer.from(head("200 OK", FILE.length)), FILE.subarray(0, 5)]));
  socket.end(Buffer.concat([Buffer.from(head("200 OK", FILE.length)), FILE]));
}

/** Runs `body` with a stub server that gives `answers` in order, one to each request, and the file after them. */
async function withServer(answers: Answer[], body: (url: string) => Promise<void>) {
  let requests = 0;
  const server = createServer(socket => socket.once("data", () => answer(socket, answers[requests++] ?? "file")));
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as { port: number };
  try {
    await body(`http://127.0.0.1:${port}/releases/download/engine-1/model.onnx`);
  } finally {
    server.close();
  }
  return requests;
}

/** downloadRetrying with its waits and its lines recorded. */
function recorded() {
  const waits: number[] = [], lines: string[] = [];
  return { waits, lines, options: { sleep: async (ms: number) => { waits.push(ms); },
                                    log: (line: string) => lines.push(line) } };
}

test("a 504 gets another try, after a wait, and the file comes on the second", async () => {
  const r = recorded();
  const requests = await withServer(["504"], async url => {
    assert.deepEqual(await downloadRetrying("model", url, r.options), FILE);
  });
  assert.equal(requests, 2);
  assert.deepEqual(r.waits, [2000]);
  assert.equal(r.lines.length, 1);
  assert.match(r.lines[0], /^model: try 1 of 4: http:\S+\/model\.onnx gave HTTP 504\. The next try in 2 s\.$/);
});

test("a body cut before its Content-Length gets another try", async () => {
  const r = recorded();
  const requests = await withServer(["cut"], async url => {
    assert.deepEqual(await downloadRetrying("model", url, r.options), FILE);
  });
  assert.equal(requests, 2);
  assert.deepEqual(r.waits, [2000]);
  assert.match(r.lines[0], /^model: try 1 of 4: \S+\/model\.onnx stopped before the end of the file /);
  assert.match(r.lines[0], /content-length/i);
});

test("a connection reset before the answer gets another try", async () => {
  const r = recorded();
  const requests = await withServer(["reset"], async url => {
    assert.deepEqual(await downloadRetrying("model", url, r.options), FILE);
  });
  assert.equal(requests, 2);
  assert.match(r.lines[0], /^model: try 1 of 4: \S+\/model\.onnx gave no answer /);
});

test("each transient failure waits longer, and the last stops the step", async () => {
  const r = recorded();
  const requests = await withServer(["504", "cut", "reset", "504"], async url => {
    await assert.rejects(downloadRetrying("model", url, r.options),
                         { message: /^model: \S+\/model\.onnx gave HTTP 504, at try 4 of 4$/ });
  });
  assert.equal(requests, 4);
  assert.deepEqual(r.waits, [2000, 5000, 15000]);
  assert.deepEqual(r.lines.map(line => line.match(/try (\d) of 4/)?.[1]), ["1", "2", "3"]);
});

test("a 404 fails at once", async () => {
  const r = recorded();
  const requests = await withServer(["404"], async url => {
    await assert.rejects(downloadRetrying("model", url, r.options),
                         { message: /^model: \S+\/model\.onnx gave HTTP 404$/ });
  });
  assert.equal(requests, 1);
  assert.deepEqual(r.waits, []);
  assert.deepEqual(r.lines, []);
});

// The step checks the SHA-256 of what comes back (fetch-engine.mjs): a whole body that is another file is no failure
// of the download, and another try would give the same bytes.
test("a whole body comes back as it is, after one request", async () => {
  const r = recorded();
  const requests = await withServer(["wrong"], async url => {
    assert.equal((await downloadRetrying("model", url, r.options)).toString(), "wrong");
  });
  assert.equal(requests, 1);
  assert.deepEqual(r.waits, []);
});
