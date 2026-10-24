// A strategyjam.org game of Blueprints as a game record (docs/design/33-drawing-board.md). The game is what the game page
// and strategyjam.org's archive hold: the players by seat, First then Second, the first position (`initial`), the moves
// in the site's strings (the page's `history`, the archive's `moves[].move`), the clock and the result. First moves
// first, so First is Blue. The moves are the record's as they are (notation.ts). As Hedge School's import
// (its src/lib/game/strategyjam.ts), the function here is self-contained: no imports, and nothing from outside its own
// body, so that a tool can run it on the game's page.

export interface JamGame {
  id: string; // the game's id: its page is https://strategyjam.org/blueprints/game/ID
  rules: string; // the id of the rules module that the game plays: "blueprints"
  version: number; // that module's version
  seats: (string | null)[]; // the players' names, First's then Second's: null for an open seat
  initial: unknown; // the first position: its cells and the players' blueprints
  history: string[]; // the moves
  scores: number[] | null; // First's and Second's after the last move, from the page's rules module: null if not known
  result: { winner: number | null; reason?: string; aborted?: boolean } | null; // the winner's seat: null while the game goes on
  startedAt: number | null; // when the game started, in milliseconds since 1970
  clock: { initialMs: number; incrementMs: number } | null; // each player's time, and the time added after each move
}

/** The game's record. Throws when the game is not one that Drawing Board can review. */
export function jamRecord(g: JamGame): string {
  if (g.rules !== "blueprints") throw new Error(`this page shows a game of ${g.rules}, not of Blueprints`);
  if (g.version !== 3) throw new Error(`this game uses version ${g.version} of the strategyjam.org rules, which the engine does not know`);
  if (!g.history.length) throw new Error("this game has no moves yet");

  // The standard start of the rules' version 3: each player's three blueprints, each a cell with a ring of six. Blue's
  // are on the board with their centres (0,1) at q = -6, -10 and -2 (r = 0), Red's at 6, 10 and 2. Every game of the
  // archive starts so. The record has no other start yet (design 33, item 10).
  const RING = ["0,1", "1,1", "1,0", "0,0", "-1,1", "-1,2", "0,2"]; // the centre, then the ring
  // A blueprint's kinds in RING's order: s star, p plain, w wall.
  const kinds = (code: string) => Object.fromEntries(RING.map((c, i) => [c, ({ s: "star", p: "plain", w: "wall" } as Record<string, string>)[code[i]]]));
  const hands = [["spppppp", "swswsws", "spppppp"], ["spppppp", "sswswsw", "spppppp"]].map(h => h.map(kinds));
  const cells: Record<string, [number, string]> = {};
  hands.forEach((hand, player) => hand.forEach((blueprint, i) => {
    const centre = (player ? 1 : -1) * [6, 10, 2][i];
    for (const [cell, kind] of Object.entries(blueprint)) {
      const [q, r] = cell.split(",").map(Number);
      cells[`${centre + q},${r - 1}`] = [player, kind];
    }
  }));
  const same = (a: unknown, b: unknown): boolean => a === b || (typeof a === "object" && typeof b === "object" && a !== null && b !== null
    && Object.keys(a).length === Object.keys(b).length
    && Object.entries(a).every(([k, v]) => same(v, (b as Record<string, unknown>)[k])));
  const initial = (g.initial ?? {}) as { cells?: unknown; blueprints?: unknown };
  if (!same(initial.cells, cells) || !same(initial.blueprints, hands))
    throw new Error("this game does not start from the standard start, and Drawing Board reads games from the standard start only");

  // Turns: First's first turn has one move, every later turn two. A pass is one move: a player whose clock ran out.
  const MOVE = /^(?:[1-3]@-?\d+,-?\d+|[1-3]:-?\d+,-?\d+>[1-3]:-?\d+,-?\d+|pass)$/;
  const turns: string[][] = [];
  g.history.forEach((move, ply) => {
    if (!MOVE.test(move)) throw new Error(`move ${ply + 1} is not a move of Blueprints: ${move}`);
    if (ply === 0 || ply % 2 === 1) turns.push([]);
    turns[turns.length - 1].push(move);
  });

  // The site gives the winner by seat, and its reason in words. A game that the rules ended (120 moves) has its margin
  // from the scores. One that ended before, with a winner, ended by a resignation, else by a forfeit (a no-show, a
  // timeout).
  const r = g.result, s = g.scores, ended = g.history.length >= 120, fmt = (x: number) => String(Math.round(x * 1e6) / 1e6);
  let result = "*", termination = "";
  if (r && !r.aborted) {
    const w = r.winner === 0 ? "b" : r.winner === 1 ? "r" : null;
    if (!w) { result = "0"; if (ended) termination = "normal"; }
    else if (ended) { if (s) { result = `${w}+${fmt(Math.abs(s[0] - s[1]))}`; termination = "normal"; } }
    else if (/resign/i.test(r.reason ?? "")) { result = `${w}+R`; termination = "resignation"; }
    else { result = `${w}+F`; termination = "forfeit"; }
  }
  const date = g.startedAt ? new Date(g.startedAt) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const tags: [string, string][] = [
    ["Event", "strategyjam.org game"], ["Site", `https://strategyjam.org/blueprints/game/${g.id}`],
    ["Date", date ? `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}` : "????.??.??"],
    ["Round", "-"], ["Blue", g.seats[0] ?? "?"], ["Red", g.seats[1] ?? "?"], ["Result", result],
  ];
  // No TimeControl, as in Hedge School's record of a strategyjam.org game (design 11): strategyjam.org adds its
  // increment for each move, where the notation's TimeControl adds it for each turn.
  tags.push(["GameId", g.id]);
  if (s && result !== "*") tags.push(["Scores", `${fmt(s[0])}/${fmt(s[1])}`]);
  if (termination) tags.push(["Termination", termination]);
  const head = tags.map(([k, v]) => `[${k} "${v.replace(/(["\\])/g, "\\$1")}"]`).join("\n");
  const body = turns.map((t, i) => `${i + 1}. ${t.join(" ")}`).join(" ");
  return `${head}\n\n${body} ${result}\n`;
}
