// The game of a short PTN Ninja link, `ptn.ninja/s/<id>` (docs/design/34-tak-site.md, item 10): the link holds an id
// alone, so the page asks PTN Ninja's shortener for the game, as PTN Ninja itself does when it opens the link. The
// shortener lets any site's page ask it, so no Function of the site is between them. Its source is in
// github.com/gruppler/PTN-Ninja (functions/index.js, `short`; src/store/ui/getters.js, `urlUnshort`).
import { bounded, TooLong } from "./playtakProxy.ts";

/** PTN Ninja's shortener, before the id: the address that PTN Ninja's README names. */
const SHORTENER = "https://url.ptn.ninja/short?id=";

/** A short link's id. The shortener makes one from a hash, in hexadecimal digits. The site also takes the other letters
 *  that an id in an address can have, as a link that was made by hand can. */
export const SHORT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The record that the shortener holds for `id`, as its answer gives it. Throws an Error that says what is wrong, as a
 *  sentence for the player. The answer is not kept: a short link expires. */
export async function shortRecord(id: string, request: typeof fetch): Promise<string> {
  const failed = "The site could not get the game from PTN Ninja. Paste the PTN of the game, or try again later.";
  let response: Response, answer: { ptn?: unknown; message?: unknown } | null;
  try {
    response = await request(SHORTENER + id, {
      signal: AbortSignal.timeout(20000), credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", cache: "no-store",
    });
    answer = JSON.parse(await bounded(response));
  } catch (e) {
    throw new Error(e instanceof TooLong ? "The game in this short link is too long for the site." : failed);
  }
  if (response.status === 400 && answer?.message === "URL alias not found")
    throw new Error("PTN Ninja has no game for this short link. A short link that no one opens expires.");
  if (!response.ok || typeof answer?.ptn !== "string" || !answer.ptn.trim()) throw new Error(failed);
  return answer.ptn;
}
