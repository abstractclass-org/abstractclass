// The sites that link their games to a site here and take their players' reviews back (Hedge School's design 18,
// Cyanotype's design 33, "Partner sites"). A link may name the page where its site takes a review back (`save`): only on
// a partner's own host, over https, so that the Export menu's "Save to …" sends a review only to the site that the game
// came from. A partner's page can also open a review that it kept (`from`): it sends the review file to the import page
// or the review. Either way the review travels in the player's browser, by window messages between the two pages, when
// the player asks: the sites have no server. Each site gives its parts (partnerSite) in its src/lib/game/partners.ts:
// its messages' name, its name, its list of partners and the partners' test switch.

export interface Partner { name: string; hosts: string[] }

/** What a game keeps of the site it came from: the partner's name and its save page. The shared store keeps it
 *  (@abstractclass/analysis/games.ts, setGamePartner). */
export interface GamePartner { name: string; save: string }

/** A site's parts of the partners' code. */
export interface PartnerSite {
  /** The start of the messages' names, which names the site: "hedge-school" gives `hedge-school:ready`. */
  messages: string;
  /** The site's name in the texts: "Hedge School". */
  name: string;
  /** The partner sites, by name and hosts. */
  partners: Partner[];
  /** The partners' test: a partner's pages on the developer's own computer count too. The site turns it on in the
   *  build of the branch partner_test and in a local build made with VITE_PARTNER_TEST=1, never on the live site or
   *  the dev preview (Hedge School's vite.config.ts, design 18). */
  test: boolean;
}

/** A partner's pages on the developer's own computer, for a partner's test (PartnerSite's `test`). */
const TEST_SITE: Partner = { name: "the local test site", hosts: ["127.0.0.1", "localhost"] };

/** The messages between a site and a partner's page, protocol 1 (Hedge School's design 18). The page that receives the
 *  review file posts `ready` to the other, and the other sends `review`. To save, the partner's page then posts `saved`
 *  or `failed`. To open, it may post `failed` in place of the review. Each name starts with the site's (PartnerSite's
 *  `messages`): `hedge-school:ready`. */
export const PROTOCOL = 1;
type FromPartner = { type?: unknown; message?: string; review?: unknown };

const READY_MS = 60_000; // for the partner's page to load (and its player to sign in)
const SAVED_MS = 60_000; // for it to store the review

/** What a site's arrival step gives to receive a review that a partner kept (receiveKeptReview). */
export interface KeptReviewSteps<L extends { id: string }> {
  /** The page says that it waits for the partner, by its name. */
  waiting: (sender: string) => void;
  /** The site's loader of a review file, from its text: it keeps the game, and answers its id. */
  load: (text: string) => Promise<L>;
  /** Keeps the partner's save page with the game: the shared store's setGamePartner. */
  keep: (id: string, partner: GamePartner) => Promise<void>;
}

/** The partners' code with a site's parts. */
export function partnerSite(site: PartnerSite) {
  const test = site.test ? TEST_SITE : null;
  const ready = `${site.messages}:ready`, review = `${site.messages}:review`;
  const saved = `${site.messages}:saved`, failed = `${site.messages}:failed`;

  /** The partner whose site `address` is on, or null: an https address on a partner's host (http too for the test
   *  site). */
  function partnerOf(address: string): Partner | null {
    let url: URL;
    try { url = new URL(address); } catch { return null; }
    if (test?.hosts.includes(url.hostname) && (url.protocol === "http:" || url.protocol === "https:")) return test;
    if (url.protocol !== "https:") return null;
    return site.partners.find(p => p.hosts.includes(url.hostname)) ?? null;
  }

  /** A link's save page, kept with the game when it is a partner's (partnerOf); null otherwise. */
  function gamePartner(save: string | null): GamePartner | null {
    const p = save ? partnerOf(save) : null;
    return p && save ? { name: p.name, save } : null;
  }

  /** Opens the partner's save page at once (the browser allows a new tab only within the click), then sends it the
   *  review file when the page is ready, and resolves with the partner's answer. `file` may still be in the making. */
  function saveToPartner(partner: GamePartner, file: Promise<{ name: string; review: unknown }>): Promise<void> {
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
        if (m?.type === ready) {
          clearTimeout(timer);
          try {
            const f = await file;
            win.postMessage({ type: review, protocol: PROTOCOL, name: f.name, review: f.review }, target);
          } catch (e) { end(e instanceof Error ? e : new Error(String(e))); return; }
          timer = setTimeout(() => end(new Error(`${partner.name} did not say whether it saved the review`)), SAVED_MS);
        } else if (m?.type === saved) end();
        else if (m?.type === failed) end(new Error(`${partner.name}: ${m.message || "it did not save the review"}`));
      };
      window.addEventListener("message", onMessage);
    });
  }

  /** Asks the partner's page that opened this one for the review file it kept (Hedge School's design 18), and
   *  resolves with it. `from` is that page's origin, which the link names. The page must open this one with
   *  window.open: a link with a target cuts the tie, and so does a Cross-Origin-Opener-Policy of same-origin. */
  function receiveFromPartner(partner: Partner, from: string): Promise<unknown> {
    const opener = window.opener as Window | null;
    if (!opener) return Promise.reject(new Error(`${partner.name}'s page is gone, or did not let this page answer it. Open the review again from ${partner.name}.`));
    const target = new URL(from).origin;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => end(new Error(`${partner.name} did not send the review`)), READY_MS);
      const end = (error: Error | null, sent?: unknown) => {
        clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        if (error) reject(error); else resolve(sent);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== opener || event.origin !== target) return; // only the page that opened this one, on its origin
        const m = event.data as FromPartner;
        if (m?.type === review) end(null, m.review);
        else if (m?.type === failed) end(new Error(`${partner.name}: ${m.message || "it did not send the review"}`));
      };
      window.addEventListener("message", onMessage);
      opener.postMessage({ type: ready, protocol: PROTOCOL }, target);
    });
  }

  /** Receives a review that a partner site kept (Hedge School's design 18): the partner by its page's origin `from`,
   *  the review file that its page sends when this page asks, loaded by the site's loader, and the link's save page
   *  `save` kept with the game when it is the partner's. Resolves with what the loader answers. */
  async function receiveKeptReview<L extends { id: string }>(from: string, save: string | null,
                                                             steps: KeptReviewSteps<L>): Promise<L> {
    const partner = partnerOf(from);
    if (!partner) throw new Error(`the link names a site that is not one of ${site.name}'s partners`);
    steps.waiting(partner.name);
    const sent = await receiveFromPartner(partner, from);
    const loaded = await steps.load(typeof sent === "string" ? sent : JSON.stringify(sent));
    const kept = gamePartner(save);
    if (kept) await steps.keep(loaded.id, kept);
    return loaded;
  }

  return { partnerOf, gamePartner, saveToPartner, receiveKeptReview };
}
