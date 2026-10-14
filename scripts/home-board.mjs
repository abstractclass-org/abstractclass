// The home page's board (src/routes/+page.svelte): a position from a game of HedgeFund against itself, the site's own
// game, not a player's. The practice bot plays both sides from the standard start (design 24's engine files, after
// `npm run engine`), the analysis module describes the position after EDGES edges, and the board's position goes to
// src/lib/home/board.json with the moves and the settings that made it. The same seed and settings give the same game.
// Run: node scripts/home-board.mjs [edges] [seed]
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { nodeEngine } from "./node-engine.mjs";
import { boardPosition } from "../src/lib/engine/position.ts";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const EDGES = Number(process.argv[2] ?? 100), SEED = Number(process.argv[3] ?? 7), VISITS = 64;
const { manifest, call } = await nodeEngine(root);
const file = kind => manifest.artifacts.find(a => a.kind === kind);
const network = manifest.artifacts.find(a => a.kind === "model" && a.id.startsWith("b10c128"));
const lib = await import(pathToFileURL(join(root, "static", file("practice-library").url)).href);
const bot = await lib.createPracticeBot(await WebAssembly.compile(readFileSync(join(root, "static", file("practice-module").url))));
bot.setModel(readFileSync(join(root, "static", network.url)));
const gtp = line => {
  const r = bot.command(line);
  if (!r.startsWith("=")) throw new Error(`${line}: ${r}`);
  return r.slice(1).trim();
};
gtp(`enclosure-start ${SEED}`);
gtp(`kata-set-param maxVisits ${VISITS}`);

const moves = [];
const describe = () => call({ id: "d", action: "describe", moves });
for (let d = describe(); moves.length < EDGES && d.outcome === null; d = describe()) {
  moves.push(gtp(`genmove ${d.mover === "b" ? "b" : "w"}`));
}
const end = describe();
mkdirSync(join(root, "src/lib/home"), { recursive: true });
writeFileSync(join(root, "src/lib/home/board.json"), JSON.stringify({
  made: { by: "scripts/home-board.mjs", network: network.id, visits: VISITS, seed: SEED, engine: JSON.parse(gtp("enclosure-bot-info")).build },
  moves, position: boardPosition(end),
}) + "\n");
console.log(`${moves.length} edges, scores ${end.scores.map(Math.round).join(" to ")}, mover ${end.mover}`);
