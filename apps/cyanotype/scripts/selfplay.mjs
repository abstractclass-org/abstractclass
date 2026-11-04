// A game of Stamp Duty against itself, for the review's tests and its look (design 33), as Hedge School's
// scripts/test-fixture.mjs plays HedgeFund against itself: the practice bot plays both sides from the standard start
// to the game's end, Blue at fewer visits a move than Red, with Low variety, so that Blue's weaker moves give the
// review's quality labels their range. The engine's describe gives each position's legal moves, and each of the bot's
// moves must be one of them. describe_game gives what each move did, and the record writes each move with its capture
// mark. The game is the site's own: this repository holds no one else's games.
//
//   npm run engine && node scripts/selfplay.mjs [--seed N] [--blue VISITS] [--red VISITS] [--out FILE]
//
// The bot and the rules run on the CPU in Node, from the site's static/engine, as the site's checks run them
// (@abstractclass/engine/node-engine.mjs). The output's default is src/lib/review/fixtures/stamp-duty.txt.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { gtpAnswer, gtpColor, settingsCommands } from "@abstractclass/practice/practice.ts";
import { turnFromCount } from "@abstractclass/analysis/turns.ts";
import { writeRecord } from "@abstractclass/record/record.ts";
import { blueprints, playedText } from "../src/lib/review/blueprints.ts";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The value of the option `--name VALUE`, or `fallback`. @param {string} name @param {string} fallback */
const option = (name, fallback) => { const k = process.argv.indexOf(`--${name}`); return k < 0 ? fallback : process.argv[k + 1]; };
const SEED = Number(option("seed", "11")), BLUE = Number(option("blue", "4")), RED = Number(option("red", "64"));
const OUT = resolve(option("out", join(app, "src", "lib", "review", "fixtures", "stamp-duty.txt")));
const HALFLIFE = 19; // the practice's (src/lib/practice/stampduty.ts)

if (!hasEngine(app)) throw new Error("no engine in static/engine: run `npm run engine` first");
const manifest = JSON.parse(readFileSync(join(app, "static", "engine", "manifest.json"), "utf8"));
/** @param {string} kind */
const file = kind => {
  const a = manifest.artifacts.find((/** @type {{ kind: string }} */ x) => x.kind === kind);
  if (!a) throw new Error(`static/engine/manifest.json has no ${kind}`);
  return join(app, "static", a.url);
};
const network = manifest.artifacts.find((/** @type {{ kind: string }} */ a) => a.kind === "model");
const library = await import(pathToFileURL(file("practice-library")).href);
const bot = await library.createPracticeBot(await WebAssembly.compile(readFileSync(file("practice-module"))));
bot.setModel(readFileSync(file("model")));
/** A GTP command's answer, or a thrown error. @param {string} line */
function command(line) {
  try { return gtpAnswer(/** @type {string} */ (bot.command(line))); }
  catch (e) { throw new Error(`${line}: ${e instanceof Error ? e.message : e}`); }
}
command(`blueprints-start ${SEED}`);
for (const line of settingsCommands({ network: network.id, visits: BLUE, variety: "low" }, HALFLIFE)) command(line);

const { call } = await nodeEngine(app);
/** @type {string[]} */
const moves = [];
const t0 = performance.now();
for (;;) {
  const now = call({ id: "d", action: "describe", moves });
  if (now.error) throw new Error(`describe: ${now.error}`);
  if (now.outcome) break;
  const player = now.mover === "b" ? 0 : 1;
  command(`kata-set-param maxVisits ${player === 0 ? BLUE : RED}`);
  const move = command(`genmove ${gtpColor(player)}`);
  if (!now.legal.includes(move)) throw new Error(`move ${moves.length + 1}: ${move} is not a legal move here`);
  moves.push(move);
  if (moves.length % 20 === 0) console.log(`${moves.length} moves, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
}

// Each move with its capture mark, from what it did, as the review writes it (blueprints.ts), and the record's turns:
// Blue's first has one move, then two a turn.
const positions = call({ id: "g", action: "describe_game", moves }).positions;
const texts = moves.map((m, i) => playedText(blueprints.played(m, positions[i], positions[i + 1])));
/** @type {{ number: number; moves: number }[]} */
const turns = [];
moves.forEach((_, i) => {
  const { turn, first } = turnFromCount(i);
  if (first) turns.push({ number: turn, moves: 1 }); else turns[turns.length - 1].moves++;
});
const end = positions.at(-1), result = end.outcome?.result ?? "*";
const visits = (/** @type {number} */ n) => `${n} visit${n === 1 ? "" : "s"}`;
const record = writeRecord({
  Event: "Stamp Duty against itself", Date: new Date().toISOString().slice(0, 10).replaceAll("-", "."),
  Blue: `Stamp Duty, ${visits(BLUE)}`, Red: `Stamp Duty, ${visits(RED)}`, Network: network.id, Seed: String(SEED),
  Scores: `${end.scores[0]}/${end.scores[1]}`,
}, texts, turns, result);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, record);
console.log(`${moves.length} moves, ${result}, ${((performance.now() - t0) / 1000).toFixed(0)} s: wrote ${OUT}`);
