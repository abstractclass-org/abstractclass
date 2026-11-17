// The engine step's downloads (fetch-engine.mjs), with the retry rule. A failure that can pass in a moment gets
// another try after a wait (RETRY_WAITS_S), and each retry prints a line with the file's id, its URL, the try and the
// cause. Such a failure is one of these:
//
// - No answer: fetch throws before the response's head, for a reset, a timeout or a lookup that failed.
// - An HTTP status that a server gives for a transient failure: a 5xx (GitHub gives 504), 408 or 429.
// - A body that stops before its end. Node's fetch counts the body's bytes against its Content-Length, and reads a
//   chunked body to its last chunk. The read throws when the connection closes before that end
//   (UND_ERR_RES_CONTENT_LENGTH_MISMATCH, or "Invalid EOF state" for a chunked body) or when it is reset
//   (UND_ERR_SOCKET, ECONNRESET).
//
// No try waits for good: Node's fetch (undici) stops a try that has no head after 300 s, or no byte of the body for
// 300 s, and that is a failure of the first or the third kind.
//
// Any other HTTP status, such as 404, stops the step at once. A body that fetch read to its end is whole, and it is
// returned: the step checks its SHA-256 (fetch-engine.mjs). A wrong SHA-256 is then a wrong file, and another try
// would give the same file, so the step stops at once.
import { fetchReason } from "./errors.ts";

/** The waits before the second, third and fourth try, in seconds. A file that never comes waits 22 s in all. */
export const RETRY_WAITS_S: readonly number[] = [2, 5, 15];

const transientStatus = (status: number) => status >= 500 || status === 408 || status === 429;

type Try = { bytes: Buffer } | { problem: string; transient: boolean; cause?: unknown };

async function tryOnce(url: string): Promise<Try> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (e) {
    return { problem: `${url} gave no answer (${fetchReason(e)})`, transient: true, cause: e };
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    return { problem: `${url} gave HTTP ${response.status}`, transient: transientStatus(response.status) };
  }
  try {
    return { bytes: Buffer.from(await response.arrayBuffer()) };
  } catch (e) {
    return { problem: `${url} stopped before the end of the file (${fetchReason(e)})`, transient: true, cause: e };
  }
}

export interface DownloadOptions {
  /** Waits `ms`. The tests record the waits instead. */
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

/** Downloads `url` for the file `id`, with the retry rule above. A failure stops the step with an error that names
 *  `id`, the URL and the HTTP status or the network's error. */
export async function downloadRetrying(id: string, url: string, options: DownloadOptions = {}): Promise<Buffer> {
  const { sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms)), log = console.log } = options;
  const tries = RETRY_WAITS_S.length + 1;
  for (let n = 1; ; n++) {
    const result = await tryOnce(url);
    if ("bytes" in result) return result.bytes;
    if (!result.transient) throw new Error(`${id}: ${result.problem}`, { cause: result.cause });
    if (n === tries) throw new Error(`${id}: ${result.problem}, at try ${n} of ${tries}`, { cause: result.cause });
    const wait = RETRY_WAITS_S[n - 1];
    log(`${id}: try ${n} of ${tries}: ${result.problem}. The next try in ${wait} s.`);
    await sleep(wait * 1000);
  }
}
