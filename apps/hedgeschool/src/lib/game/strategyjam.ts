// A strategyjam.org game as a game record. The bookmarklet (bookmarklet.ts) and the userscript (userscript.ts) run this
// on the strategyjam.org game page, so the function here is self-contained: no imports, and nothing from outside its
// own body. A strategyjam.org game is what its page holds (strategyjamPage.ts), as the engine repository's
// docs/context.md ("strategyjam.org internals") describes it: the players by seat, First then Second, and the moves one
// by one, each `FROM-TO` with the columns a to s and the rows 1 to 19 (`a10-d10`), or `pass` for a timeout. First
// starts with a10-d10, Blue's A10-D10 in the engine's notation, so First is Blue.

export interface JamGame {
  page: string; // the game's page: its address, without a query
  rules: string; // the id of the rules module that the page plays: "enclosure"
  version: number; // that module's version
  seats: (string | null)[]; // the players' names, First's then Second's: null for an open seat
  history: string[]; // the moves
  scores: number[] | null; // First's and Second's after the last move, from the page's rules module: null if it failed
  result: { winner: number | null; reason?: string; aborted?: boolean } | null; // the winner's seat: null while the game goes on
  startedAt: number | null; // when the game started, in milliseconds since 1970
}

/** The game's record in the engine repository's notation. Throws when the game is not one the engine can review. */
export function jamRecord(g: JamGame): string {
  if (g.rules !== "enclosure") throw new Error(`this page shows a game of ${g.rules}, not of Enclosure`);
  if (g.version !== 1) throw new Error(`this game uses version ${g.version} of the strategyjam.org rules, which the engine does not know`);
  if (!g.history.length) throw new Error("this game has no moves yet");
  const siteColumns = "abcdefghijklmnopqrs", columns = "ABCDEFGHJKLMNOPQRST"; // the notation's have no I
  const edge = (move: string, ply: number) => {
    const m = /^([a-s])(1[0-9]|[1-9])-([a-s])(1[0-9]|[1-9])$/.exec(move);
    if (!m) throw new Error(`move ${ply + 1} is not an edge: ${move}`);
    const a = `${columns[siteColumns.indexOf(m[1])]}${m[2]}`, b = `${columns[siteColumns.indexOf(m[3])]}${m[4]}`;
    return m[1] < m[3] || (m[1] === m[3] && Number(m[2]) < Number(m[4])) ? `${a}-${b}` : `${b}-${a}`;
  };

  // Turns: First's first turn has one edge, every later turn two, and a pass ends a turn (the rest is forfeited). The
  // rules end the game after 120 edges, the forfeited ones included.
  const turns: string[][] = [];
  let left = 0, edges = 0;
  g.history.forEach((move, ply) => {
    if (!left) { turns.push([]); left = turns.length === 1 ? 1 : 2; }
    const pass = move === "pass";
    turns[turns.length - 1].push(pass ? "pass" : edge(move, ply));
    edges += pass ? left : 1;
    left = pass ? 0 : left - 1;
  });

  // The site gives the winner by seat, and its reason in words. A game that the rules ended has its margin from the
  // scores. One that ended before, with a winner, ended by a resignation, else by a forfeit: a timeout is a pass, and
  // the game goes on.
  const r = g.result, s = g.scores, fmt = (x: number) => String(Math.round(x * 1e6) / 1e6);
  let result = "*", termination = "";
  if (r && !r.aborted) {
    const w = r.winner === 0 ? "b" : r.winner === 1 ? "r" : null;
    if (!w) { result = "0"; if (edges >= 120) termination = "normal"; }
    else if (edges >= 120) { if (s) { result = `${w}+${fmt(Math.abs(s[0] - s[1]))}`; termination = "normal"; } }
    else if (/resign/i.test(r.reason ?? "")) { result = `${w}+R`; termination = "resignation"; }
    else { result = `${w}+F`; termination = "forfeit"; }
  }
  const date = g.startedAt ? new Date(g.startedAt) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  // The page as the Site, as Lichess writes it: the review links back to it. No TimeControl: strategyjam.org adds its
  // increment for each edge, where the notation's TimeControl adds it for each turn.
  const tags: [string, string][] = [
    ["Event", "strategyjam.org game"], ["Site", g.page],
    ["Date", date ? `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}` : "????.??.??"],
    ["Round", "-"], ["Blue", g.seats[0] ?? "?"], ["Red", g.seats[1] ?? "?"], ["Result", result],
  ];
  if (s && result !== "*") tags.push(["Scores", `${fmt(s[0])}/${fmt(s[1])}`]);
  if (termination) tags.push(["Termination", termination]);
  const head = tags.map(([k, v]) => `[${k} "${v.replace(/(["\\])/g, "\\$1")}"]`).join("\n");
  const body = turns.map((t, i) => `${i + 1}. ${t.join(" ")}`).join(" ");
  return `${head}\n\n${body} ${result}\n`;
}
