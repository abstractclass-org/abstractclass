// What the bookmarklet and the userscript (tools.ts) run in the player's own playtak.com page, and their messages
// (docs/design/34-tak-site.md, "The tools for playtak's pages"). Each function is self-contained (no imports, nothing
// from outside its own body): the two carry their source as text. The page is playtak's web client, playtak-ui
// (github.com/USTakAssociation/playtak-ui, MIT), read for its shape only:
// - `gameData` (its src/js/game-interface.js): the game's number (`id`, 0 for the scratch board and for a game that a
//   link loaded), its size, its komi as half flats (`komi`: playtak's server sends it so, and its own PTN writer halves
//   it), its reserves (`pieces`, `capstones`), its opening, its result ("" while the game goes on), the first move's
//   number from a set-up position (`move_start`) and the position on screen (`move_shown`). It is a `let` of the page's
//   scripts: no property of `window`, so a script reads it by its name.
// - The move list `#moveslist`: the moves exist only there, as PTN text, one row a number: [number, White's move,
//   Black's move]. A result has a row of its own, but "0-0" (a game that ended with no result) takes a move's cell. A
//   game from a set-up position starts with the cell "load". The double black stack's first move is written `2a1`.
// - The players' names: the first `.player1-name` and `.player2-name` of the page.
// Its own PTN export (getNotation, in its src/js/main.js) reads these too. The page shows one game at a time: one that
// the player plays, watches or loaded, or one that ended there.

/** A game on playtak's page, as the tools read it. Each value is text, as the record writes it: "" for none. */
export interface PlaytakGame {
  id: string; // the game's number on playtak, "" for a game that has none on the page
  white: string; black: string; // the players' names, as the page shows them
  size: string; komi: string; flats: string; caps: string;
  opening: string; // playtak's name of the opening: "swap", or "double black stack"
  moves: string[]; // the moves, as the page writes them
  result: string; // a PTN result, or "*" while the game goes on
  at: string; // the position on screen, as the moves before it, or "" when the page does not say
}

/** Why the page gives no game: "none", the page holds no game of playtak's board; "empty", the game has no move yet;
 *  "start", the game starts from a set-up position, which the page does not keep; "history", the page is a game of
 *  playtak's history, which Mistak takes by its address. */
export type PlaytakMissing = "none" | "empty" | "start" | "history";

// The page's own game, a `let` of its scripts (above).
declare const gameData: unknown;

/** The game that the page shows, or why it shows none. No request to playtak, and nothing from the player's login. */
export function findPlaytakGame(): PlaytakGame | PlaytakMissing {
  type Data = { id?: unknown; size?: unknown; komi?: unknown; pieces?: unknown; capstones?: unknown; opening?: unknown;
                result?: unknown; move_start?: unknown; move_shown?: unknown };
  const RESULTS = ["R-0", "0-R", "F-0", "0-F", "1-0", "0-1", "1/2-1/2", "0-0"];
  const data = (typeof gameData === "object" && gameData !== null ? gameData : null) as Data | null;
  const list = document.querySelector("#moveslist");
  if (!data || !list) return /^\/games\/\d+/.test(location.pathname) ? "history" : "none";
  const moves: string[] = [];
  for (const row of Array.from(list.querySelectorAll("tr"))) {
    const cells = Array.from(row.querySelectorAll("td")).map(cell => (cell.textContent ?? "").trim());
    // A row's first cell is its number ("12."). No move is written as a result.
    for (const text of cells.slice(1)) {
      if (text === "load") return "start";
      if (text !== "" && text !== "--" && !RESULTS.includes(text)) moves.push(text);
    }
  }
  if (Number(data.move_start) > 0) return "start";
  if (moves.length === 0) return "empty";
  const number = (value: unknown) => (typeof value === "number" || typeof value === "string") && value !== ""
    && Number.isFinite(Number(value)) ? Number(value) : null;
  const name = (selector: string) => (document.querySelector(selector)?.textContent ?? "").trim();
  const id = number(data.id), komi = number(data.komi), flats = number(data.pieces), caps = number(data.capstones);
  const shown = number(data.move_shown);
  return {
    id: id !== null && id > 0 ? String(id) : "",
    white: name(".player1-name"), black: name(".player2-name"),
    size: String(number(data.size) ?? ""), komi: komi === null ? "" : String(komi / 2),
    flats: flats === null ? "" : String(flats), caps: caps === null ? "" : String(caps),
    opening: typeof data.opening === "string" ? data.opening : "",
    moves,
    // The page's result while it shows one, or none: "Game Over" (the 2D board's scratch game) is none.
    result: typeof data.result === "string" && RESULTS.includes(data.result) ? data.result : "*",
    at: shown !== null && Number.isInteger(shown) && shown >= 0 && shown <= moves.length ? String(shown) : "",
  };
}

/** The game's record in PTN: the tags in playtak's order, a line for each number, and the result after the last move,
 *  as Mistak writes a record (src/lib/game/record.ts, writeRecord). A tag's value holds no `"`: PTN has no escapes, so
 *  it is written as two `'`, as ptn.ninja writes it. The record has no Opening tag for the swap opening, as playtak's
 *  own export, and `PlayTakID` when the page gives the game's number. */
export function pageRecord(game: PlaytakGame): string {
  const tags: [string, string][] = [
    ["Site", "PlayTak.com"], ["Player1", game.white], ["Player2", game.black],
    ["Result", game.result === "*" ? "" : game.result], ["Size", game.size], ["Komi", game.komi], ["Flats", game.flats],
    ["Caps", game.caps], ["Opening", game.opening === "swap" ? "" : game.opening], ["PlayTakID", game.id],
  ];
  const head = tags.filter(([, value]) => value !== "").map(([tag, value]) => `[${tag} "${value.replaceAll('"', "''")}"]`);
  const lines: string[] = [];
  for (let i = 0; i < game.moves.length; i += 2) lines.push(`${i / 2 + 1}. ${game.moves.slice(i, i + 2).join(" ")}`);
  return `${head.join("\n")}\n\n${lines.join("\n")} ${game.result}\n`;
}

/** What to tell the player when the page gives no game. `click` names what they click again: "the Open in Mistak
 *  bookmark", or "the Mistak button". `origin` is this site's address: with no game on a page that shows one, playtak
 *  possibly changed its page, and this site's tools page has the tools as they are now. Strict Simplified Technical
 *  English: the player follows these texts. */
export function explain(why: PlaytakMissing, click: string, origin: string): string {
  return "Mistak: " + (why === "none"
    ? `this page shows no game that Mistak can read. Open a game on playtak.com: a game that you play or watch, or a game that you load. Then click ${click} again. If a game shows and you see this message again, playtak.com possibly changed its page. The newest bookmarklet and userscript are on ${origin}/tools.`
    : why === "empty" ? `this game has no moves yet. Wait for the first move. Then click ${click} again.`
    : why === "start" ? `this game starts from a set-up position. The page does not keep that position, so Mistak cannot read the game from the page. Paste the PTN or the link that loaded the game in the Review tab: ${origin}/review.`
    : `this page is a game from the history of playtak.com. Copy the address of this page. Paste it in the Review tab: ${origin}/review.`);
}
