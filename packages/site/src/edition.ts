// The site's edition (Hedge School's design 11, "One build switch", and Cyanotype's design 33): the full site, for
// development, or the early access. The build sets it: VITE_EDITION=early. Both sites read it here.
export const EARLY_ACCESS = import.meta.env.VITE_EDITION === "early";
/** Whether this build stores practice games (Hedge School's design 25): VITE_STORE_PRACTICE_GAMES=on in the production
 *  and preview deployments, each with a database of its own. A build on a developer's machine sends nothing. Both
 *  sites read it here. */
export const STORES_PRACTICE_GAMES = import.meta.env.VITE_STORE_PRACTICE_GAMES === "on";
