// A site's visit counts (Hedge School's design 11): Cloudflare Web Analytics, with no cookies, and Google Analytics in
// Google's consent mode, advanced form. The Google tag loads on every page with its cookies denied, so until the
// visitor accepts it sends cookieless pings. "Accept" grants its cookies, "Decline" keeps them denied. Ads are never
// granted: the sites have none.
//
// Each site makes one Analytics with its build's two services and its own keys in the browser (Hedge School's and
// Cyanotype's src/lib/analytics.svelte.ts). Without the services, as in development, nothing loads, and the banner
// asks only about the purposes that the build has (none in development). Neither service sees a game: a page whose
// address holds a game after its `#` (a record, a packed review or analysis, Hedge School's design 22) takes it out of
// the address before it starts them, every other page starts them from the layout, and the review names its game's id
// after the `#`, which neither records.
//
// Google Analytics also takes events (Hedge School's design 17): what a visitor did, in counts and ranges
// (measure.ts), for the decisions in that design. A visitor who has not accepted sends them as cookieless pings,
// counted with no visitor. A browser with the flag of internal traffic (internalTraffic.ts) marks its events, so that
// the owner's visits stay out.
//
// The visitor's consent has a choice for each purpose (Hedge School's design 25): Google Analytics' cookies, and the
// random number that links this browser's practice games, where the site stores them. The banner's Accept and Decline
// set both, and the privacy page each.
//
// A blocker (an ad blocker, or the browser's tracking protection) can stop the Google tag (Hedge School's design 27).
// The page does not look for blockers: it knows only whether its own tag ran. A visitor who accepted Google Analytics'
// cookies, and whose tag did not run, is asked to allow the site in the blocker until they close the ask
// (AnalyticsAsk.svelte). The site never sends the tag through its own address to get past a blocker: that would
// override the visitor's own choice.
import { readLocal, readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";

export type Consent = "granted" | "denied";
export type Purpose = "analytics" | "games";
export type EventParams = Record<string, string | number | boolean>;

/** What a site gives its analytics: the build's two services (none in development), its keys in this browser, whether
 *  it stores practice games (the purpose "games"), and the flag of internal traffic. */
export interface AnalyticsOptions {
  gaId: string | undefined; // Google Analytics' measurement ID
  cfToken: string | undefined; // Cloudflare Web Analytics' token
  keys: {
    consent: string; // the choice for each purpose
    number: string; // the random number that links this browser's practice games
    ask: string; // "closed": the visitor closed the ask to allow Google Analytics
  };
  storesGames: boolean;
  isInternal: () => boolean;
}

declare global {
  interface Window { dataLayer: unknown[] }
}

// gtag.js reads each command as an `arguments` object, so this is a function, not an arrow.
function gtag(..._args: unknown[]) {
  window.dataLayer.push(arguments);
}

/** One site's analytics. Its members are arrows, so that a site can export them one by one. */
export class Analytics {
  /** The purposes that this build asks about: Google Analytics' cookies where it loads, the games' link where the
   *  build stores practice games. */
  readonly purposes: Purpose[];
  /** Whether the site asks for consent: only a build with a purpose does. */
  readonly asksConsent: boolean;
  /** The visitor's choice for each purpose, null before they choose: read as the site starts (the constructor). */
  readonly consent = $state<Record<Purpose, Consent | null>>({ analytics: null, games: null });

  readonly #o: AnalyticsOptions;
  /** Whether the Google tag's script answered in this page and the tag did not run: the script failed to load (a
   *  blocker, the browser's tracking protection, or a failed network load), or loaded and did not run as the tag (a
   *  blocker's stand-in script). False until the script answers, and in a build without it. */
  #tagFailed = $state(false);
  #askClosed = $state(false);
  #started = false;
  readonly #sent = new Set<string>();

  constructor(o: AnalyticsOptions) {
    this.#o = o;
    this.purposes = [...(o.gaId ? ["analytics" as const] : []), ...(o.storesGames ? ["games" as const] : [])];
    this.asksConsent = this.purposes.length > 0;
    Object.assign(this.consent, this.#readChoices());
    this.#askClosed = this.#askKeptClosed();
    // A choice made in another tab of the site (its banner or its privacy page): the browser tells the other tabs when
    // one writes the key, and each takes the choice, so that its banner, its privacy page and its Google tag follow
    // it. The ask closed in another tab closes here too.
    if (typeof window !== "undefined") {
      window.addEventListener("storage", e => {
        if (e.key === o.keys.ask || e.key === null) this.#askClosed = this.#askKeptClosed();
        if (e.key !== o.keys.consent && e.key !== null) return; // null: the site's storage cleared
        const now = this.#readChoices();
        if (now.analytics !== this.consent.analytics && this.#started && o.gaId)
          gtag("consent", "update", { analytics_storage: now.analytics ?? "denied" });
        Object.assign(this.consent, now);
      });
    }
  }

  #readChoices(): Record<Purpose, Consent | null> {
    const kept = readLocalJson<Partial<Record<Purpose, unknown>>>(this.#o.keys.consent) ?? {};
    const one = (v: unknown) => (v === "granted" || v === "denied" ? v : null);
    return { analytics: one(kept.analytics), games: one(kept.games) };
  }
  #askKeptClosed = () => readLocal(this.#o.keys.ask) === "closed";

  /** Whether the visitor has chosen for every purpose that this build asks about: the banner shows until they have. */
  consentChosen = () => this.purposes.every(p => this.consent[p] !== null);

  /** Whether the visitor accepts the games' link now, as the browser keeps it, not as this page read it: another tab
   *  may have changed it since. Read before a game takes or sends the number. */
  linksGames = () => this.#readChoices().games === "granted";

  /** Whether to ask the visitor to allow Google Analytics in their blocker (Hedge School's design 27): they accepted
   *  its cookies, the banner is gone, and the tag did not run in this page. Once closed, never again in this
   *  browser. */
  asksToAllow = () => this.consentChosen() && this.consent.analytics === "granted" && this.#tagFailed && !this.#askClosed;

  /** Closes the ask for good in this browser. */
  closeAsk = () => {
    this.#askClosed = true;
    writeLocal(this.#o.keys.ask, "closed");
  };

  /** Loads both services once. Call it only when the address holds no record. */
  startAnalytics = () => {
    if (this.#started) return;
    this.#started = true;
    const { gaId, cfToken } = this.#o;
    if (cfToken) addScript("https://static.cloudflareinsights.com/beacon.min.js", { "data-cf-beacon": JSON.stringify({ token: cfToken }) });
    if (gaId) {
      window.dataLayer = window.dataLayer || [];
      // The defaults come before the tag's first command (Google's consent mode guide).
      gtag("consent", "default", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: this.consent.analytics ?? "denied",
      });
      gtag("js", new Date());
      // A browser with the flag of internal traffic (internalTraffic.ts): the tag gives every event of the page the
      // parameter that Google's "Internal Traffic" filter drops, the first page view too.
      if (this.#o.isInternal()) gtag("config", gaId, { traffic_type: "internal" });
      else gtag("config", gaId);
      const script = addScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`);
      // gtag.js defines google_tag_manager as it runs, before its load event. A blocker's stand-in for it (uBlock
      // Origin's googletagmanager_gtm.js, or Firefox's SmartBlock shim) loads, and defines none.
      script.onload = () => (this.#tagFailed = !("google_tag_manager" in window));
      script.onerror = () => (this.#tagFailed = true);
    }
  };

  /** Sends an event to Google Analytics (Hedge School's design 17): its name and parameters, counts and ranges only,
   *  never a game, a player's name or a game's id. Nothing in a build without it, or before the services start. */
  track = (name: string, params: EventParams = {}) => {
    if (this.#o.gaId && this.#started) gtag("event", name, params);
  };

  /** Sends an event once for each `key` in this page's life: a feature's first use in a review, not each use. The key
   *  stays in the page: it may name the game. */
  trackOnce = (key: string, name: string, params: EventParams = {}) => {
    if (this.#sent.has(key)) return;
    this.#sent.add(key);
    this.track(name, params);
  };

  /** Sets properties of the visitor that Google Analytics gives every later event (ranges only). */
  setVisitor = (properties: Record<string, string>) => {
    if (this.#o.gaId && this.#started) gtag("set", "user_properties", properties);
  };

  /** Keeps the visitor's choice for a purpose, and tells the Google tag of its own. */
  choose = (purpose: Purpose, choice: Consent) => {
    this.consent[purpose] = choice;
    writeLocal(this.#o.keys.consent, JSON.stringify(this.consent));
    if (purpose === "analytics" && this.#started && this.#o.gaId) gtag("consent", "update", { analytics_storage: choice });
  };

  /** A switch on the privacy page: the choice for its purpose, and "denied" for each purpose not chosen yet, as its
   *  switch shows it off. So a visitor can accept one purpose and decline another without granting it first. */
  chooseShown = (purpose: Purpose, choice: Consent) => {
    for (const p of this.purposes) if (p !== purpose && this.consent[p] === null) this.choose(p, "denied");
    this.choose(purpose, choice);
  };

  /** The banner's Accept or Decline: the same choice for every purpose that this build asks about. */
  chooseAll = (choice: Consent) => {
    for (const p of this.purposes) this.choose(p, choice);
  };

  /** The random number that links this browser's practice games: made on the first game sent with the visitor's
   *  consent, and null without it. A number kept from before stays in the browser after a Decline, unsent, so that the
   *  privacy page can still delete its games (keptNumber). */
  browserNumber = (): string | null => {
    if (!this.linksGames()) return null;
    const kept = readLocal(this.#o.keys.number);
    if (kept) return kept;
    const made = crypto.randomUUID();
    writeLocal(this.#o.keys.number, made);
    return made;
  };

  /** The number kept in this browser, whatever the consent now: the games that went with it can be deleted. */
  keptNumber = () => readLocal(this.#o.keys.number);

  /** Forgets the number, once its games are deleted: the next game with consent takes a new one. */
  forgetNumber = () => writeLocal(this.#o.keys.number, null);
}

function addScript(src: string, attributes: Record<string, string> = {}) {
  const script = document.createElement("script");
  script.async = true; // as Google's snippet loads gtag.js
  script.src = src;
  for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
  document.head.append(script);
  return script;
}
