// The proxy that gives a page the PTN of a finished playtak game (docs/design/34-tak-site.md, "The check of CORS"):
// playtak's API refuses a request from the site's pages, so a Pages Function of the site asks it
// (functions/api/playtak/[[path]].ts, and the path in static/_routes.json). It is not an open proxy: it takes the number
// of one game, and it sends none of the browser's headers. A finished game never changes, so Cloudflare keeps its answer
// for a day. The Function keeps no log. Its bundle takes this module only: it has no imports.

/** The path on the site that gives a playtak game's PTN, before the game's number. */
export const PLAYTAK_PATH = "/api/playtak/ptn/";

/** playtak's API, before the game's number. */
const API = "https://api.playtak.com/v1/games-history/ptn/";

/** A game's number as playtak writes it: digits, with no 0 before them, so that a game has one address. */
export const GAME_ID = /^[1-9]\d{0,9}$/;

/** What the Function needs of Cloudflare and of time. Tests give their own. */
export interface PlaytakDeps {
  fetch: (request: Request) => Promise<Response>;
  cache: () => Pick<Cache, "match" | "put"> | undefined;
  /** Waits before the one retry of a status 429. */
  wait: (ms: number) => Promise<void>;
  /** The longest time of one request to playtak, its answer's body included, in milliseconds. */
  timeout: number;
}

/** The part of a Pages Function's context that the proxy reads. */
export interface PlaytakContext { request: Request; waitUntil(promise: Promise<unknown>): void }

const cloudflare: PlaytakDeps = {
  fetch: request => fetch(request),
  // Cloudflare's Cache API. It caches nothing on a *.pages.dev address.
  cache: () => (globalThis as { caches?: { default?: Cache } }).caches?.default,
  wait: ms => new Promise(done => setTimeout(done, ms)),
  timeout: 8000,
};

/** A day, in seconds: how long Cloudflare keeps a finished game. */
const KEPT = 86400;

/** An answer with no body, for a request that the proxy refuses or that playtak does not answer. */
const bare = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers });

/** playtak's answer to the request for one game, its body read: a status, a content type and the text. */
interface Answer { status: number; type: string; text: string }

/** Asks playtak for one game. It throws when playtak does not answer in time. The request is a new one, so it has none
 *  of the browser's headers. It follows no redirect: the API's answer comes from the API's own address. */
async function ask(id: string, { fetch, timeout }: PlaytakDeps): Promise<Answer> {
  const response = await fetch(new Request(API + id, {
    headers: { "User-Agent": "Mistak (https://mistak.abstractclass.org)", Accept: "text/plain" },
    redirect: "manual", signal: AbortSignal.timeout(timeout),
  }));
  return { status: response.status, type: response.headers.get("Content-Type") ?? "", text: await response.text() };
}

/** The content type of an answer: playtak's for text and JSON, else text. The answer is on the site's own address, so
 *  it is never a page that a browser runs. */
const safeType = (type: string) => (/^(?:text\/plain|application\/json)\b/i.test(type) ? type : "text/plain; charset=utf-8");

/** The Function's handler for every method (`export const onRequest = playtakProxy();`). */
export function playtakProxy(deps: PlaytakDeps = cloudflare) {
  return async ({ request, waitUntil }: PlaytakContext): Promise<Response> => {
    const url = new URL(request.url);
    const id = url.pathname.startsWith(PLAYTAK_PATH) ? url.pathname.slice(PLAYTAK_PATH.length) : "";
    if (!GAME_ID.test(id)) return bare(404);
    if (request.method !== "GET") return bare(405, { Allow: "GET" });
    // The game's one address is the key: a query changes nothing, so it makes no second copy.
    const key = new Request(url.origin + PLAYTAK_PATH + id), cache = deps.cache();
    const kept = await cache?.match(key);
    if (kept) return kept;
    let answer: Answer;
    try {
      answer = await ask(id, deps);
      if (answer.status === 429) {
        await deps.wait(1000);
        answer = await ask(id, deps);
      }
    } catch {
      return bare(502); // a timeout, or no connection
    }
    // A redirect has nothing to pass back, and a 429 twice or a fault of playtak's is not an answer about the game.
    const { status } = answer;
    if (status < 200 || (status >= 300 && status < 400) || status === 429 || status >= 500) return bare(502);
    const response = new Response(answer.text, { status, headers: {
      "Content-Type": safeType(answer.type), "X-Content-Type-Options": "nosniff",
      "Cache-Control": status === 200 ? `public, max-age=${KEPT}` : "no-store",
    } });
    if (status === 200 && cache) waitUntil(cache.put(key, response.clone()));
    return response;
  };
}
