// A site's visit counts (Hedge School's design 11): Cloudflare Web Analytics and PostHog, both with no cookies and
// nothing stored in the browser for them, so neither asks for consent. PostHog runs in its cookieless mode
// (posthog.ts): it counts visitors by a hash on its servers.
//
// Each site makes one Analytics with its build's two services and its own keys in the browser (Hedge School's and
// Cyanotype's src/lib/analytics.svelte.ts). Without the services, as in development and in the previews, nothing
// loads. Neither service sees a game: a page whose address holds a game after its `#` (a record, a packed review or
// analysis, Hedge School's design 22) takes it out of the address before it starts them, every other page starts them
// from the layout, and the review names its game's id after the `#`, which neither records.
//
// PostHog also takes events (Hedge School's design 17): what a visitor did, in counts and ranges (measure.ts), for the
// decisions in that design. A browser with the flag of internal traffic (internalTraffic.ts) marks its events, so that
// the owner's visits stay out.
//
// The consent has one purpose (Hedge School's design 25), in a build that stores practice games: the random number
// that links this browser's practice games, where the site stores them. The banner's Accept and Decline set it, and
// the privacy page's switch. A build that stores no practice games asks for no consent.
import { readLocalJson, readLocal, writeLocal } from "@abstractclass/storage/local.ts";

export type Consent = "granted" | "denied";
export type Purpose = "games";
export type EventParams = Record<string, string | number | boolean>;

/** The part of PostHog's client that the site uses (posthog.ts). */
interface PostHogClient {
  capture(name: string, properties?: EventParams): unknown;
  register(properties: EventParams): void;
}

/** What a site gives its analytics: the build's two services (none in development), the keys of the practice games'
 *  consent where the build stores them, and the flag of internal traffic. */
export interface AnalyticsOptions {
  /** PostHog's project key, and the import of its client (posthog.ts). The site imports the client only in a build
   *  with the key, so that a build without it holds none of PostHog's code. */
  posthog: { key: string; load: () => Promise<typeof import("./posthog.ts")> } | undefined;
  cfToken: string | undefined; // Cloudflare Web Analytics' token
  /** Where a build that stores practice games keeps the consent (the purpose "games"), and the random number. */
  games: { consent: string; number: string } | undefined;
  isInternal: () => boolean;
}

/** One site's analytics. Its members are arrows, so that a site can export them one by one. */
export class Analytics {
  /** The purposes that this build asks about: the games' link where the build stores practice games. */
  readonly purposes: Purpose[];
  /** Whether the site asks for consent: only a build with a purpose does. */
  readonly asksConsent: boolean;
  /** The visitor's choice for each purpose, null before they choose: read as the site starts (the constructor). */
  readonly consent = $state<Record<Purpose, Consent | null>>({ games: null });

  readonly #o: AnalyticsOptions;
  #started = false;
  /** PostHog's client once it has loaded, and before that the calls that wait for it. */
  #client: PostHogClient | null = null;
  #waiting: ((client: PostHogClient) => void)[] = [];
  readonly #sent = new Set<string>();

  constructor(o: AnalyticsOptions) {
    this.#o = o;
    this.purposes = o.games ? ["games"] : [];
    this.asksConsent = this.purposes.length > 0;
    Object.assign(this.consent, this.#readChoices());
    // A choice made in another tab of the site (its banner or its privacy page): the browser tells the other tabs when
    // one writes the key, and each takes the choice, so that its banner and its privacy page follow it.
    if (typeof window !== "undefined" && o.games) {
      const key = o.games.consent;
      window.addEventListener("storage", e => {
        if (e.key === key || e.key === null) Object.assign(this.consent, this.#readChoices()); // null: storage cleared
      });
    }
  }

  #readChoices(): Record<Purpose, Consent | null> {
    const kept = this.#o.games ? readLocalJson<Partial<Record<Purpose, unknown>>>(this.#o.games.consent) ?? {} : {};
    return { games: kept.games === "granted" || kept.games === "denied" ? kept.games : null };
  }

  /** Whether the visitor has chosen for every purpose that this build asks about: the banner shows until they have. */
  consentChosen = () => this.purposes.every(p => this.consent[p] !== null);

  /** Whether the visitor accepts the games' link now, as the browser keeps it, not as this page read it: another tab
   *  may have changed it since. Read before a game takes or sends the number. */
  linksGames = () => this.#readChoices().games === "granted";

  /** Loads both services once. Call it only when the address holds no record. */
  startAnalytics = () => {
    if (this.#started) return;
    this.#started = true;
    const { posthog, cfToken } = this.#o;
    if (cfToken) addScript("https://static.cloudflareinsights.com/beacon.min.js", { "data-cf-beacon": JSON.stringify({ token: cfToken }) });
    if (posthog) {
      // A browser with the flag of internal traffic (internalTraffic.ts): every event of the page has the property
      // `internal`, the first page view too, for PostHog's filter of internal and test users.
      const properties: EventParams = this.#o.isInternal() ? { internal: true } : {};
      posthog.load().then(
        m => {
          const client = m.startPostHog(posthog.key, properties);
          this.#client = client;
          for (const call of this.#waiting) call(client);
          this.#waiting = [];
        },
        () => (this.#waiting = []), // the client's file did not load: the page counts nothing
      );
    }
  };

  /** Calls PostHog's client now, or once it has loaded. Nothing in a build without it, or before the services
   *  start. */
  #withClient(call: (client: PostHogClient) => void) {
    if (!this.#o.posthog || !this.#started) return;
    if (this.#client) call(this.#client);
    else this.#waiting.push(call);
  }

  /** Sends an event to PostHog (Hedge School's design 17): its name and properties, counts and ranges only, never a
   *  game, a player's name or a game's id. */
  track = (name: string, params: EventParams = {}) => this.#withClient(c => c.capture(name, params));

  /** Sends an event once for each `key` in this page's life: a feature's first use in a review, not each use. The key
   *  stays in the page: it may name the game. */
  trackOnce = (key: string, name: string, params: EventParams = {}) => {
    if (this.#sent.has(key)) return;
    this.#sent.add(key);
    this.track(name, params);
  };

  /** Properties of the visitor (ranges only) that every later event of the page carries: PostHog's super properties,
   *  which cookieless mode keeps in the page's memory. Not a person property: the site makes no person profiles. */
  setVisitor = (properties: Record<string, string>) => this.#withClient(c => c.register(properties));

  /** Keeps the visitor's choice for a purpose. */
  choose = (purpose: Purpose, choice: Consent) => {
    if (!this.#o.games) return;
    this.consent[purpose] = choice;
    writeLocal(this.#o.games.consent, JSON.stringify(this.consent));
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
    if (!this.#o.games || !this.linksGames()) return null;
    const kept = readLocal(this.#o.games.number);
    if (kept) return kept;
    const made = crypto.randomUUID();
    writeLocal(this.#o.games.number, made);
    return made;
  };

  /** The number kept in this browser, whatever the consent now: the games that went with it can be deleted. */
  keptNumber = () => (this.#o.games ? readLocal(this.#o.games.number) : null);

  /** Forgets the number, once its games are deleted: the next game with consent takes a new one. */
  forgetNumber = () => {
    if (this.#o.games) writeLocal(this.#o.games.number, null);
  };
}

function addScript(src: string, attributes: Record<string, string>) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
  document.head.append(script);
}
