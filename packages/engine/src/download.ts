// The engine step's downloads (fetch-engine.mjs), with the retry rule. A failure that can pass in a moment gets
// another try after a wait (RETRY_WAITS_S), and each retry prints a line with the file's id, its URL, the try and the
// cause. Such a failure is one of these:
//
// - No answer: fetch throws before the response's head, for a reset, a timeout or a lookup that failed.
// - An HTTP status that a server gives for a passing failure: a 5xx (GitHub gives 504), 408 or 429.
// - A body that stops before its end. Node's fetch counts the body's bytes against its Content-Length, and the read
//   throws when the connection closes before the last byte (UND_ERR_RES_CONTENT_LENGTH_MISMATCH) or when it is reset
//   (UND_ERR_SOCKET).
//
// Any other failure stops the step at once: another HTTP status, such as 404, or a whole body whose SHA-256 is not
// the locked one. A whole body is one that fetch read to its Content-Length, so a wrong SHA-256 is a wrong file, and
// another try gives the same file.
import { createHash } from "node:crypto";
import { fetchReason } from "./errors.ts";

/** The waits before the second, third and fourth try, in seconds. A file that never comes waits 22 s in all. */
export const RETRY_WAITS_S: readonly number[] = [2, 5, 15];

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Stops the step when `bytes` are not the file of SHA-256 `locked`. */
export function checkSha256(id: string, bytes: Uint8Array, locked: string) {
  const hash = sha256(bytes);
  if (hash !== locked)
    throw new Error(`${id}: SHA-256 ${hash} is not the locked ${locked}. ` +
                    `If the build changed on purpose, update engine.lock.json.`);
}

const passingStatus = (status: number) => status >= 500 || status === 408 || status === 429;

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
    return { problem: `${url} gave HTTP ${response.status}`, transient: passingStatus(response.status) };
  }
  try {
    return { bytes: Buffer.from(await response.arrayBuffer()) };
  } catch (e) {
    return { problem: `${url} stopped before the end of the file (${fetchReason(e)})`, transient: true, cause: e };
  }
}

export interface DownloadOptions {
  /** The locked SHA-256 of the file. Without it, the bytes are not checked (a release's manifest). */
  sha256?: string;
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
    if ("bytes" in result) {
      if (options.sha256) checkSha256(id, result.bytes, options.sha256);
      return result.bytes;
    }
    if (!result.transient) throw new Error(`${id}: ${result.problem}`, { cause: result.cause });
    if (n === tries) throw new Error(`${id}: ${result.problem}, at try ${n} of ${tries}`, { cause: result.cause });
    const wait = RETRY_WAITS_S[n - 1];
    log(`${id}: try ${n} of ${tries}: ${result.problem}. The next try in ${wait} s.`);
    await sleep(wait * 1000);
  }
}
