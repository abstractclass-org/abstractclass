// The board lab's positions (src/lib/board/fixtures.ts), from Stamp Duty's early build: each position is a game of
// moves from the standard start, and the engine gives the position, every legal move and what each move did. The site
// has no rules (CLAUDE.md): it never computes which moves are legal, so the lab's legal moves come from here, complete.
// The candidates and their lines are hand-made marks, but the engine plays each of them where it stands, and refuses
// one that is not legal. No game of strategyjam.org's archive: this repository is public.
//
//   node scripts/board-fixtures.mjs [ENGINE_FOLDER]     writes src/lib/board/fixtures.json
//
// ENGINE_FOLDER: the build's folder, with its manifest.json and its module blueprints-engine.wasm (the engine
// repository's games/blueprints/README.md, "The browser build"). By default, the engine repository's checkout beside
// this repository's (also from a worktree): engines/runs/wasm/blueprints/engine-0d2a5416. The engine's files are not in
// this repository, and CI has none: the build and the tests read the stored data file, and the test that runs the
// engine again and compares (src/lib/board/fixtures.engine.test.ts) is skipped without the folder.
//
// The module runs on the CPU with Node's own WASI imports: describe and describe_game need no network, and the module
// needs only the clocks, random bytes and standard error. `call` repeats the engine's driver: the build's gpu_engine.mjs
// drives the CPU module too (createCpuEngine), and Hedge School's scripts/node-engine.mjs starts its module with it.
// This copy goes when the engine comes into Drawing Board's page (abscls-8tl1.7): node-engine.mjs then moves into
// packages/engine for both sites, and this script starts the module with the library through it (design 33).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WASI } from "node:wasi";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The build that the data file comes from. */
export const ENGINE_TAG = "engine-0d2a5416";
export const DATA_FILE = join(app, "src", "lib", "board", "fixtures.json");

/** The build's folder: `folder`, or else the engine repository's checkout beside an ancestor of this app. Null when
 *  there is none (CI). */
export function engineFolder(folder = process.env.BLUEPRINTS_ENGINE) {
  if (folder) return resolve(folder);
  for (let dir = app; ; dir = dirname(dir)) {
    const found = join(dir, "engines", "runs", "wasm", "blueprints", ENGINE_TAG);
    if (existsSync(join(found, "manifest.json"))) return found;
    if (dirname(dir) === dir) return null;
  }
}

/** The CPU module, instantiated: `call(request)` sends one request of the engine protocol and parses its reply. A reply
 *  with an error throws.
 *  @param {string} folder */
export async function blueprintsEngine(folder) {
  const manifest = JSON.parse(readFileSync(join(folder, "manifest.json"), "utf8"));
  const asset = manifest.assets.find((/** @type {{ kind: string }} */ a) => a.kind === "module");
  const bytes = readFileSync(join(folder, asset.file));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== asset.sha256) throw new Error(`${asset.file}: SHA-256 ${sha256}, but the manifest gives ${asset.sha256}`);
  const wasi = new WASI({ version: "preview1", returnOnExit: true });
  const imports = /** @type {WebAssembly.Imports} */ (wasi.getImportObject());
  const instance = await WebAssembly.instantiate(await WebAssembly.compile(bytes), imports);
  const ex = /** @type {{ memory: WebAssembly.Memory, engine_alloc(n: number): number,
                          engine_call(p: number, n: number): number }} */ (/** @type {unknown} */ (instance.exports));
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  /** @param {object} request */
  function call(request) {
    const text = encoder.encode(JSON.stringify(request));
    const p = ex.engine_alloc(text.length);
    new Uint8Array(ex.memory.buffer, p, text.length).set(text);
    const out = ex.engine_call(p, text.length);
    const length = new DataView(ex.memory.buffer).getUint32(out, true);
    const reply = JSON.parse(decoder.decode(new Uint8Array(ex.memory.buffer, out + 4, length)));
    if (reply.error) throw new Error(`${JSON.stringify(request).slice(0, 200)}: ${reply.error}`);
    return reply;
  }
  return { engine: { tag: ENGINE_TAG, build: asset.build, protocol: asset.protocol, sha256 }, call };
}

/** The lab's games, from the standard start. The middle game's candidates are Red's, with hand-made notes, and three of
 *  them have a line: the moves after the candidate, one after another. */
export const GAMES = [
  { name: "The start", moves: [] },
  {
    name: "A middle game",
    // Nine moves: six placements that capture, and two edits, one of them in one blueprint.
    moves: ["1@-1,1", "1@1,-3", "1@1,2", "1@-1,-4", "1:-1,1>3:-1,0", "1@2,-6", "1:-1,1>1:-1,0", "1@-2,4", "1@0,-7"],
    candidates: [
      { move: "2@3,-9", note: "Score +1.4" },
      { move: "1@0,5", note: "−0.6" },
      { move: "2:0,2>2:2,0", note: "−1.1" },
      { move: "3@0,5", note: "−2.3" },
      { move: "1@2,-9", note: "−2.9" }, // most of its hexes are the first choice's: candidates overlap
    ],
    lines: {
      "2@3,-9": ["2@3,-9", "1@0,5", "1:0,2>1:-1,1"],
      "1@0,5": ["1@0,5", "2@3,-9"],
      "2:0,2>2:2,0": ["2:0,2>2:2,0", "3@0,5"],
    },
  },
  {
    name: "A capture",
    // The last move, the first of Red's turn, captures three of Blue's cells, a star among them, and scores 18.
    moves: ["2@-4,-4", "2@3,-4", "2@3,1", "2@-3,-7", "1:-1,1>3:-1,0", "2@3,-7", "1:-1,1>1:-1,0", "2@-4,-9", "2@-4,2",
            "2@-1,1"],
  },
  // Blue's first move moves blueprint 3's anchor cell to blueprint 1: blueprint 3 goes back to its frame.
  { name: "An edit", moves: ["3:0,0>1:2,1"] },
  {
    name: "An empty blueprint",
    // Red moves the seven cells of its blueprint 3 to blueprints 1 and 2, the last one with the first move of its
    // turn, and moves again.
    moves: ["1@-1,1", "3:-1,1>1:-1,0", "3:-1,2>2:-1,0", "1@1,-3", "1@1,2", "3:0,0>1:-1,1", "3:-1,1>1:-1,2", "1@4,2",
            "1@7,1", "3:-1,2>2:-1,1", "3:0,0>2:-1,2", "1@4,-4", "1@7,-4", "3:0,0>1:-1,0"],
  },
];

const player = (/** @type {string} */ mover) => (mover === "b" ? 0 : 1);
/** What a move did, from the position after it: the player who made it, the hexes that a placement filled, the cells
 *  that it captured and its points, and the hands after it.
 *  @param {string} move @param {any} before @param {any} after */
const step = (move, before, after) => ({
  move, player: player(before.mover), footprint: after.footprint, captured: after.captured, points: after.points,
  blueprints: after.blueprints,
});

/** The data file's content: each game's position, mover and legal moves, its last move with the hands before it, its
 *  candidates and their lines, as the engine gives them.
 *  @param {(request: object) => any} call */
export function describeGames(call) {
  return GAMES.map(game => {
    const n = game.moves.length;
    const now = call({ id: "d", action: "describe", moves: game.moves });
    const positions = call({ id: "g", action: "describe_game", moves: game.moves }).positions;
    /** The moves `more`, played after the game's moves, each with what it did. @param {string[]} more */
    const steps = more => {
      const ps = call({ id: "l", action: "describe_game", moves: [...game.moves, ...more], from: n + 1 }).positions;
      return more.map((m, i) => step(m, i ? ps[i - 1] : now, ps[i]));
    };
    return {
      name: game.name,
      moves: game.moves,
      position: { ply: now.moveCount, cells: now.cells, blueprints: now.blueprints, scores: now.scores },
      mover: player(now.mover),
      legal: now.legal,
      last: n ? step(game.moves[n - 1], positions[n - 1], positions[n]) : null,
      before: n ? positions[n - 1].blueprints : null, // the hands before the last move: an edit names its hexes there
      ...(game.candidates ? {
        candidates: game.candidates.map(c => ({ ...steps([c.move])[0], note: c.note })),
        lines: Object.fromEntries(Object.entries(game.lines ?? {}).map(([name, line]) => [name, steps(line)])),
      } : {}),
    };
  });
}

/** The data file's text: a field of a position on each line, so that a change shows by its field.
 *  @param {object} engine @param {object[]} fixtures */
export function dataText(engine, fixtures) {
  const fields = (/** @type {object} */ f) => Object.entries(f).map(([k, v]) => `      ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  return `{\n  "engine": ${JSON.stringify(engine)},\n  "fixtures": [\n${
    fixtures.map(f => `    {\n${fields(f).join(",\n")}\n    }`).join(",\n")}\n  ]\n}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folder = engineFolder(process.argv[2]);
  if (!folder) throw new Error(`no engine folder: give it, or set BLUEPRINTS_ENGINE (engines/runs/wasm/blueprints/${ENGINE_TAG})`);
  const { engine, call } = await blueprintsEngine(folder);
  const fixtures = describeGames(call);
  writeFileSync(DATA_FILE, dataText(engine, fixtures));
  for (const f of fixtures)
    console.log(`${f.name}: move ${f.position.ply}, ${f.legal.length} legal moves, ${f.candidates?.length ?? 0} candidates`);
  console.log(`wrote ${DATA_FILE} from ${folder}`);
}
