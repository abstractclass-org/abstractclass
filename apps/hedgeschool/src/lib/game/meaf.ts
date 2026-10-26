// A meaf.us game as a game record. The bookmarklet (tools.ts) runs this on the meaf.us game page, so the functions
// here are self-contained: no imports, and nothing from outside their own body. A meaf.us game is the
// object its board holds, the same shape as its archive's records (the engine repository's tools/analyze_archive.py):
// the players, the rule variant, the final scores, the winner by name (as the archive's tools compare it with the
// players), and `moveHistory`, whose entries have `from` and `to` (x and y, 0-18, y up, as the engine's points) and
// `color`, or no `from` for a timeout pass.

export interface MeafMove { from?: [number, number]; to?: [number, number]; color?: string; pass?: boolean; timestamp?: number }
export interface MeafGame {
  gameID?: string;
  blue?: string;
  red?: string;
  winner?: string | null; // the winner's name: `blue` or `red`
  phase?: string; // "done" once the game is over
  historyLength?: number; // the moves the game has, though the page can hold fewer in moveHistory (tools.ts)
  winReason?: string;
  initialTimeSeconds?: number;
  incrementSeconds?: number;
  tempo?: string;
  validation?: string;
  pruneMode?: string;
  swallowing?: boolean;
  startPosition?: string;
  scores?: { blue: number; red: number };
  moveHistory: MeafMove[];
}

/** The game's record in the engine repository's notation. Throws when the game is not one the engine can review. */
export function meafRecord(g: MeafGame): string {
  // The online variant, the engine's rules (the engine repository's docs/context.md).
  const online: Record<string, unknown> = { tempo: "1-2-2", validation: "edges-1", pruneMode: "degree-zero", swallowing: false, startPosition: "central-line" };
  for (const k of Object.keys(online)) {
    const v = (g as unknown as Record<string, unknown>)[k];
    if (v !== undefined && v !== online[k]) throw new Error(`this game uses another rule variant (${k}: ${String(v)}), which the engine does not know`);
  }
  if (!Array.isArray(g.moveHistory) || !g.moveHistory.length) throw new Error("this game has no moves yet");
  const cols = "ABCDEFGHJKLMNOPQRST";
  const point = (p: [number, number]) => `${cols[p[0]]}${p[1] + 1}`;
  const edge = (a: [number, number], b: [number, number]) =>
    a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${point(a)}-${point(b)}` : `${point(b)}-${point(a)}`;

  // Turns: Blue's first turn has one edge, every later turn two, and a pass ends a turn (the rest is forfeited).
  const turns: { player: string; moves: string[]; open: boolean }[] = [];
  const size = (turnIndex: number) => (turnIndex === 0 ? 1 : 2);
  for (const m of g.moveHistory) {
    const last = turns[turns.length - 1];
    const open = !!last && last.open;
    const isPass = !!m.pass || !m.from || !m.to;
    // A pass has no colour: it belongs to the turn in progress, or else starts the next player's turn.
    const player = isPass ? (open ? last.player : last ? (last.player === "b" ? "r" : "b") : "b") : (m.color === "red" ? "r" : "b");
    if (!(open && last.player === player)) turns.push({ player, moves: [], open: true });
    const turn = turns[turns.length - 1];
    turn.moves.push(isPass ? "pass" : edge(m.from!, m.to!));
    if (isPass || turn.moves.length >= size(turns.length - 1)) turn.open = false;
  }
  turns.forEach((t, i) => {
    const expected = i % 2 === 0 ? "b" : "r";
    if (t.player !== expected) throw new Error(`turn ${i + 1} is ${t.player === "b" ? "Blue's" : "Red's"}, where the rules give it to ${expected === "b" ? "Blue" : "Red"}`);
  });

  const s = g.scores, reason = (g.winReason ?? "").toLowerCase();
  const fmt = (x: number) => String(Math.round(x * 1e6) / 1e6);
  let result = "*", termination = "";
  const w = g.winner && g.winner === g.blue ? "b" : g.winner && g.winner === g.red ? "r" : null;
  if (w) {
    if (/resign/.test(reason)) { result = `${w}+R`; termination = "resignation"; }
    else if (/abandon|forfeit|disconnect/.test(reason)) { result = `${w}+F`; termination = "forfeit"; }
    else if (s) { result = `${w}+${fmt(Math.abs(s.blue - s.red))}`; termination = "normal"; }
  } else if (s && g.moveHistory.length >= 120 && s.blue === s.red) {
    result = "0"; termination = "normal";
  }
  const when = g.moveHistory[0].timestamp;
  const date = typeof when === "number" ? new Date(when > 1e12 ? when : when * 1000) : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  // The game's page as the Site, as strategyjam.ts writes it: the review links back to it. The watcher's view
  // (`spectate=1`) is the one that loads the moves.
  const site = g.gameID ? `https://meaf.us/sst1/?game=${encodeURIComponent(g.gameID)}&spectate=1` : "meaf.us";
  const tags: [string, string][] = [
    ["Event", "meaf.us game"], ["Site", site],
    ["Date", date ? `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}` : "????.??.??"],
    ["Round", "-"], ["Blue", g.blue ?? "?"], ["Red", g.red ?? "?"], ["Result", result],
  ];
  if (s) tags.push(["Scores", `${fmt(s.blue)}/${fmt(s.red)}`]);
  if (g.initialTimeSeconds !== undefined) tags.push(["TimeControl", `${g.initialTimeSeconds}+${g.incrementSeconds ?? 0}`]);
  if (termination) tags.push(["Termination", termination]);
  if (g.gameID) tags.push(["GameId", g.gameID]);
  const head = tags.map(([k, v]) => `[${k} "${v.replace(/(["\\])/g, "\\$1")}"]`).join("\n");
  const body = turns.map((t, i) => `${i + 1}. ${t.moves.join(" ")}`).join(" ");
  return `${head}\n\n${body} ${result}\n`;
}
