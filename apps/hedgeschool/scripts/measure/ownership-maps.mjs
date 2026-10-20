// The area map and the mistakes' explanations on real games (design 30). Two questions:
//   - How much of the board the area map marks at a position (ownership.ts, changeMap), at the threshold that it uses
//     and at two others: whether the map points at something or is noise.
//   - For the Mistakes and the Blunders, how many get a caption with a close or a cut from the opponent's next turn in
//     the engine's line (explain.ts), how many from a later turn of the line, how many the sentence that the loss is
//     spread over the board, and how many no caption (the line holds no whole turn of the opponent's).
// The games: the test fixture's (its stored review, tests/fixtures/hedgefund-review.json), or the meaf.us archive's human
// games as the engine repository analysed them (its runs/archive_analysis/part1-1000.jsonl, request 07): the first
// `perBand` games of each rating band from 1 to 5 that the rules ended, with 120 edges, as the first build of the maps
// measured them. An archive game's positions at its turns' starts are searched here as the Lite review searches them
// (HedgeFund 0.2 Lite, 512 visits, with the root's ownership and its lines' visits), on `threads` engines
// (scripts/node-engine.mjs: `npm run engine` first). For internal measurement only: the archive's games are their
// players' (CLAUDE.md, "How to work"), so the script prints counts, and captions only for the fixture's game.
//
// By turn, the labels' default unit (design 10): a turn is flagged when the mover's win chance fell by 0.10 or more (a
// Mistake or a Blunder, labels.ts) and it was not the engine's best turn. Its explanation reads the engine's first
// choice's line from the position after it, as far as the search trusts it (trustedLine), played by the rules
// (describe_game), as the review does.
//
//   node scripts/measure/ownership-maps.mjs <part1-1000.jsonl | hedgefund-review.json> [perBand] [threads]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const NETWORK = "b10c128-s89066368-d17827487", VISITS = 512;
const root = fileURLToPath(new URL("../..", import.meta.url));

if (!isMainThread) {
  const { nodeEngine } = await import("../node-engine.mjs");
  const { call } = await nodeEngine(root, { network: NETWORK });
  for (const moves of workerData.jobs) {
    const reply = call({ id: "a", moves, maxVisits: VISITS, includeOwnership: true, includePVVisits: true });
    if (reply.error) throw new Error(`${moves.join(" ")}: ${reply.error}`);
    parentPort.postMessage({ key: moves.join(" "), reply });
  }
} else {
  const { nodeEngine } = await import("../node-engine.mjs");
  const { toAnalysis } = await import("@abstractclass/analysis/reply.ts");
  const { moverWin, trustedLine } = await import("@abstractclass/analysis/model.ts");
  const { enclosure, edgeName, turnFromCount } = await import("../../src/lib/review/enclosure.ts");
  const { boardPosition } = await import("../../src/lib/engine/position.ts");
  const { occupancy } = await import("../../src/lib/review/ownership.ts");
  const { explainMistake, explanationCaption } = await import("../../src/lib/review/explain.ts");
  const { median } = await import("./speed.mjs");
  const [file, perBand = "2", threadsArg = "2"] = process.argv.slice(2);
  const threads = Number(threadsArg), fixture = file.endsWith(".json");
  const { call } = await nodeEngine(root);

  /** @type {{ id: string, moves: string[], results: Map<string, any> }[]} */
  const games = [];
  if (fixture) {
    // The stored review: each position's deepest result, by its moves
    const data = JSON.parse(readFileSync(file, "utf8")), results = new Map();
    for (const [key, a] of data.analyses) {
      const moves = key.split("|").slice(4).join("|"), had = results.get(moves);
      if (!had || a.visits > had.visits) results.set(moves, a);
    }
    const longest = [...results.keys()].reduce((a, b) => (b.split(" ").length > a.split(" ").length ? b : a));
    games.push({ id: "fixture", moves: longest.split(" "), results });
  } else {
    const all = new Map();
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line) continue;
      const p = JSON.parse(line);
      if (!all.has(p.game)) all.set(p.game, []);
      all.get(p.game)[p.index] = p.played;
    }
    const meta = new Map(JSON.parse(readFileSync(`${file}.games.json`, "utf8")).map(g => [g.game, g]));
    for (let band = 1; band <= 5; band++)
      for (const [id, moves] of [...all].filter(([id, m]) => meta.get(id).band === band && meta.get(id).end === "score" && m.length === 120)
        .slice(0, Number(perBand))) games.push({ id, moves, results: new Map() });
    // The positions at the turns' starts: the flagged turns read them, and the map is measured on them
    const jobs = games.flatMap(g => g.moves.map((_, i) => g.moves.slice(0, i)).filter(m => turnFromCount(m.length).first));
    const t0 = Date.now(), per = Math.ceil(jobs.length / threads), replies = new Map();
    await Promise.all(Array.from({ length: threads }, (_, k) => new Promise((resolve, reject) => {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: jobs.slice(k * per, (k + 1) * per) } });
      w.on("message", m => replies.set(m.key, m.reply));
      w.on("error", reject);
      w.on("exit", code => (code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))));
    })));
    console.log(`${games.length} games, ${jobs.length} positions at ${VISITS} visits in ${Math.round((Date.now() - t0) / 1000)} s on ${threads} threads\n`);
    for (const g of games)
      for (const [key, reply] of replies) if (g.moves.slice(0, key ? key.split(" ").length : 0).join(" ") === key) g.results.set(key, toAnalysis(enclosure, reply));
  }

  /** Every position of these moves from `from` on, as the rules play them (describe_game). */
  const play = (moves, from = 0) => {
    const r = call({ id: "g", action: "describe_game", moves, from });
    if (r.error) throw new Error(`describe_game: ${r.error}`);
    return r.positions;
  };

  // The map: the share of the board marked at each position searched, by stage, at three thresholds
  const THRESHOLDS = [30, 50, 70], shares = [];
  // The explanations of the flagged turns
  const rows = [];
  for (const g of games) {
    const fields = play(g.moves), board = fields.map(boardPosition), at = i => g.results.get(g.moves.slice(0, i).join(" "));
    for (let i = 0; i < board.length; i++) {
      const a = at(i);
      if (!a?.ownership) continue;
      const now = occupancy(board[i]);
      const marked = t => {
        let close = 0, lose = 0;
        a.ownership.forEach((o, k) => {
          const change = o - 100 * now[k];
          if (Math.abs(change) < t) return;
          if (now[k] === 0) close++;
          else if ((now[k] > 0) === (change < 0)) lose++;
        });
        return { close, lose };
      };
      shares.push({ edge: i, by: THRESHOLDS.map(marked) });
    }
    // The turns: runs of one mover. The last turn has no search after it: left out.
    for (let s = 0; s < g.moves.length;) {
      const mover = board[s].player;
      let e = s + 1;
      while (e < g.moves.length && board[e].player === mover) e++;
      if (e >= g.moves.length) break;
      const before = at(s), after = at(e);
      if (before && after) {
        const loss = moverWin(before.blueWin, mover) - moverWin(after.blueWin, mover);
        const best = (before.candidates[0]?.line ?? []).slice(0, e - s).map(edgeName), played = g.moves.slice(s, e);
        if (loss >= 0.10 && best.join(" ") !== played.join(" ")) {
          const line = after.candidates[0] ? trustedLine(after.candidates[0]) : [];
          const steps = line.length ? play([...g.moves.slice(0, e), ...line.map(edgeName)], e).slice(1).map(enclosure.step) : [];
          const x = explainMistake(board[e], line, steps, mover);
          rows.push({ id: g.id, edge: s + 1, line: line.length, x, caption: x && explanationCaption(x, mover, "turn") });
        }
      }
      s = e;
    }
  }

  const pc = x => `${(100 * x).toFixed(1)}%`;
  console.log("The area map: the share of the board's 361 points marked (median over the positions; close + lose)\n");
  console.log(`| Edges | Positions | ${THRESHOLDS.map(t => `At ${t / 100}`).join(" | ")} |`);
  console.log(`|---|---|${THRESHOLDS.map(() => "---").join("|")}|`);
  for (const [name, from, to] of [["0-20", 0, 20], ["21-40", 21, 40], ["41-60", 41, 60], ["61-80", 61, 80], ["81-120", 81, 120], ["All", 0, 999]]) {
    const r = shares.filter(x => x.edge >= from && x.edge <= to);
    if (!r.length) continue;
    const cells = THRESHOLDS.map((_, k) => {
      const all = median(r.map(x => (x.by[k].close + x.by[k].lose) / 361));
      return `${pc(all)} (${pc(median(r.map(x => x.by[k].close / 361)))} + ${pc(median(r.map(x => x.by[k].lose / 361)))})`;
    });
    console.log(`| ${name} | ${r.length} | ${cells.join(" | ")} |`);
  }

  const kinds = r => ({
    next: r.filter(x => x.x?.turn === 1).length, later: r.filter(x => x.x && x.x.turn > 1).length,
    spread: r.filter(x => x.x && x.x.turn === 0).length, none: r.filter(x => !x.x).length,
  });
  console.log(`\n${rows.length} flagged turns (a loss of 0.10 or more, not the engine's best turn)\n`);
  console.log("| Edges | Turns | Next turn closes or cuts | A later turn | Spread | No caption (line too short) | Line, edges (median) |");
  console.log("|---|---|---|---|---|---|---|");
  for (const [name, from, to] of [["1-16", 1, 16], ["17-40", 17, 40], ["41-60", 41, 60], ["61-120", 61, 120], ["All", 1, 999]]) {
    const r = rows.filter(x => x.edge >= from && x.edge <= to), k = kinds(r);
    if (r.length) console.log(`| ${name} | ${r.length} | ${k.next} | ${k.later} | ${k.spread} | ${k.none} | ${median(r.map(x => x.line))} |`);
  }
  const shown = rows.filter(x => x.x?.turn);
  console.log(`\nOf the ${shown.length} with a close or a cut: ${shown.filter(x => x.x.cuts.length).length} cut, ` +
              `${shown.filter(x => x.x.closed > 0).length} close, ${shown.filter(x => x.x.opened > 0).length} open the mover's area; ` +
              `by the opponent's turn: ${[1, 2, 3, 4].map(t => `${t}: ${shown.filter(x => x.x.turn === t).length}`).join(", ")}, ` +
              `later: ${shown.filter(x => x.x.turn > 4).length}`);
  if (fixture) {
    console.log("\nThe fixture's flagged turns: first edge, line's edges, caption");
    for (const x of rows) console.log(`${x.edge} ${x.line} ${x.caption ?? "(none)"}`);
  }
}
