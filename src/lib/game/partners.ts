// The sites that link their games to Hedge School and take their players' reviews back (design 18). A link may name the
// page where its site takes a review back (`save`): only on a partner's own host, over https, so that the Export menu's
// "Save to …" sends a review only to the site that the game came from. A partner's page can also open a review that it
// kept (`from`): it sends the review file to the import page. Either way the review travels in the player's browser, by
// window messages between the two pages, when the player asks: this site has no server.

export interface Partner { name: string; hosts: string[] }

/** The partner sites, by name and hosts. */
export const PARTNERS: Partner[] = [{ name: "enclosuregame.com", hosts: ["enclosuregame.com", "www.enclosuregame.com"] }];

// A partner's pages on the developer's own computer, for a partner's test: in the preview and in a local build made
// with VITE_PARTNER_TEST=1, never on the live site (vite.config.ts, design 18).
const TEST: Partner | null = import.meta.env?.VITE_PARTNER_TEST === "1" ? { name: "the local test site", hosts: ["127.0.0.1", "localhost"] } : null;

/** The partner whose site `address` is on, or null: an https address on a partner's host (http too for the test site). */
export function partnerOf(address: string): Partner | null {
  let url: URL;
  try { url = new URL(address); } catch { return null; }
  if (TEST?.hosts.includes(url.hostname) && (url.protocol === "http:" || url.protocol === "https:")) return TEST;
  if (url.protocol !== "https:") return null;
  return PARTNERS.find(p => p.hosts.includes(url.hostname)) ?? null;
}

/** What a game keeps of the site it came from: the partner's name and its save page. */
export interface GamePartner { name: string; save: string }

/** A link's save page, kept with the game when it is a partner's (partnerOf); null otherwise. */
export function gamePartner(save: string | null): GamePartner | null {
  const p = save ? partnerOf(save) : null;
  return p && save ? { name: p.name, save } : null;
}

/** The messages between this site and a partner's page, protocol 1 (design 18). The page that receives the review file
 *  posts `ready` to the other, and the other sends `review`. To save, the partner's page then posts `saved` or
 *  `failed`. To open, it may post `failed` in place of the review. */
export const PROTOCOL = 1;
type FromPartner = { type: "hedge-school:ready" } | { type: "hedge-school:saved" } | { type: "hedge-school:failed"; message?: string }
  | { type: "hedge-school:review"; review?: unknown };

const READY_MS = 60_000; // for the partner's page to load (and its player to sign in)
const SAVED_MS = 60_000; // for it to store the review

/** Opens the partner's save page at once (the browser allows a new tab only within the click), then sends it the
 *  review file when the page is ready, and resolves with the partner's answer. `file` may still be in the making. */
export function saveToPartner(partner: GamePartner, file: Promise<{ name: string; review: unknown }>): Promise<void> {
  const target = new URL(partner.save).origin;
  const win = window.open(partner.save, "_blank");
  if (!win) return Promise.reject(new Error(`the browser did not open ${partner.name}: allow this site's pop-ups`));
  return new Promise((resolve, reject) => {
    let timer = setTimeout(() => end(new Error(`${partner.name} did not answer`)), READY_MS);
    const end = (error?: Error) => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (error) reject(error); else resolve();
    };
    const onMessage = async (event: MessageEvent) => {
      if (event.source !== win || event.origin !== target) return; // only the page this site opened, on its own origin
      const m = event.data as FromPartner;
      if (m?.type === "hedge-school:ready") {
        clearTimeout(timer);
        try {
          const f = await file;
          win.postMessage({ type: "hedge-school:review", protocol: PROTOCOL, name: f.name, review: f.review }, target);
        } catch (e) { end(e instanceof Error ? e : new Error(String(e))); return; }
        timer = setTimeout(() => end(new Error(`${partner.name} did not say whether it saved the review`)), SAVED_MS);
      } else if (m?.type === "hedge-school:saved") end();
      else if (m?.type === "hedge-school:failed") end(new Error(`${partner.name}: ${m.message || "the review was not saved"}`));
    };
    window.addEventListener("message", onMessage);
  });
}

/** Asks the partner's page that opened this one for the review file it kept (design 18), and resolves with it. `from`
 *  is that page's origin, which the link names. The page must open this one with window.open: a link with a target
 *  cuts the tie, and so does a Cross-Origin-Opener-Policy of same-origin. */
export function receiveFromPartner(partner: Partner, from: string): Promise<unknown> {
  const opener = window.opener as Window | null;
  if (!opener) return Promise.reject(new Error(`${partner.name}'s page is gone, or did not let this page answer it. Open the review again from ${partner.name}.`));
  const target = new URL(from).origin;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => end(new Error(`${partner.name} did not send the review`)), READY_MS);
    const end = (error: Error | null, review?: unknown) => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (error) reject(error); else resolve(review);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== opener || event.origin !== target) return; // only the page that opened this one, on its origin
      const m = event.data as FromPartner;
      if (m?.type === "hedge-school:review") end(null, m.review);
      else if (m?.type === "hedge-school:failed") end(new Error(`${partner.name}: ${m.message || "it did not send the review"}`));
    };
    window.addEventListener("message", onMessage);
    opener.postMessage({ type: "hedge-school:ready", protocol: PROTOCOL }, target);
  });
}
