// The functions that the bookmarklet (bookmarklet.ts) and the userscript (userscript.ts) run in the game's page: a
// site's page code, which reads the game that a game site's page holds and writes its record. Hedge School's reads
// meaf.us and strategyjam.org (its src/lib/game/tools.ts), Drawing Board's strategyjam.org. Each function is
// self-contained, so the tools carry them as text: one object of them, by name, which the tool's own code takes as its
// argument.
import type { Tool } from "./importHash.ts";

/** What a site's page code finds on a click:
 *  - a game: an `id` that names it, its record (`record`, which throws an Error whose message tells the player what is
 *    wrong), and the position that the page shows (`at`), as the game's moves before it, or "" when the page does not
 *    say;
 *  - else what to tell the player (`say`). When the page lacks the game's moves and another address of the game has
 *    them (`reload`: Hedge School's meaf.us watcher's view), the tool then loads that address, and the userscript opens
 *    the game once its moves come. */
export type Found = { id: string; record: () => string; at: string } | { say: string; reload?: { url: string; id: string } };

/** A site's page code, the object `P`: functions, each a function declaration or an arrow function (a method's text is
 *  not a value). `read` reads the page on a click: it gets the object itself, for the other functions, the tool that
 *  runs it, what the player clicks (as the messages name it) and the site's address. */
export interface PageCode<P> {
  read(page: P, tool: Tool, click: string, origin: string): Found;
}

/** A page code of any site, as the tools' own code takes it. */
export interface AnyPageCode extends PageCode<AnyPageCode> {}

/** A page code as the text of an object, for a tool's script. */
export const pageCodeText = <P extends PageCode<P>>(code: P) =>
  `{ ${Object.entries(code).map(([name, f]) => `${name}: ${f}`).join(", ")} }`;
