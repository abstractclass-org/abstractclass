// Checks the meaf.us game to record conversion: the sample game in meaf.us's shape, a timeout pass, a resignation,
// the winner by name, a game in another rule variant, and the game's address as the Site tag. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { meafRecord, type MeafGame, type MeafMove } from "./meaf.ts";
import { gamePage, parseRecord } from "./record.ts";

const sample = JSON.parse(readFileSync(new URL("../mock/review.json", import.meta.url), "utf8"));
const cols = "ABCDEFGHJKLMNOPQRST";
const name = (e: number[]) => {
  const [a, b] = e[0] < e[2] || (e[0] === e[2] && e[1] < e[3]) ? [[e[0], e[1]], [e[2], e[3]]] : [[e[2], e[3]], [e[0], e[1]]];
  return `${cols[a[0]]}${a[1] + 1}-${cols[b[0]]}${b[1] + 1}`;
};
const history: MeafMove[] = sample.moves.map((m: { player: number; edge: number[] }, i: number) => ({
  // meaf.us writes an edge from its source node: give some edges in the other direction.
  from: (i % 3 ? [m.edge[0], m.edge[1]] : [m.edge[2], m.edge[3]]) as [number, number],
  to: (i % 3 ? [m.edge[2], m.edge[3]] : [m.edge[0], m.edge[1]]) as [number, number],
  color: m.player === 0 ? "blue" : "red", timestamp: 1791500000000 + i,
}));
const base: MeafGame = {
  gameID: "abc123", blue: "alice", red: "bob", winner: "bob", winReason: "score", initialTimeSeconds: 60, incrementSeconds: 15,
  tempo: "1-2-2", validation: "edges-1", pruneMode: "degree-zero", swallowing: false, startPosition: "central-line",
  scores: { blue: sample.result.blue, red: sample.result.red }, moveHistory: history,
};

test("the sample game in meaf.us's shape becomes its record", () => {
  const r = parseRecord(meafRecord(base));
  assert.deepEqual(r.moves, sample.moves.map((m: { edge: number[] }) => name(m.edge)));
  assert.equal(r.tags.Blue, "alice");
  assert.equal(r.tags.GameId, "abc123");
  assert.equal(r.tags.Event, "meaf.us game");
  assert.equal(r.tags.TimeControl, "60+15");
  assert.equal(r.result, `r+${sample.result.red - sample.result.blue}`);
});

test("a timeout pass ends the turn in progress", () => {
  // Blue's second turn: one edge, then the clock runs out.
  const moves = [history[0], history[1], history[2], history[3], { timestamp: 1 }, history[5], history[6]];
  const text = meafRecord({ ...base, moveHistory: moves, winner: undefined });
  assert.match(text, /3\. \S+ pass 4\./);
  assert.equal(parseRecord(text).moves[4], "pass");
});

test("a resignation is written as such", () => {
  const r = parseRecord(meafRecord({ ...base, winner: "alice", winReason: "resignation" }));
  assert.equal(r.result, "b+R");
  assert.equal(r.tags.Termination, "resignation");
});

test("the winner is a player's name: a colour or an unknown name gives no result", () => {
  assert.equal(parseRecord(meafRecord({ ...base, winner: "red" })).result, "*");
  assert.equal(parseRecord(meafRecord({ ...base, winner: "carol" })).result, "*");
  assert.equal(parseRecord(meafRecord({ ...base, winner: null })).result, "*");
});

test("another rule variant is refused", () => {
  assert.throws(() => meafRecord({ ...base, swallowing: true }), /rule variant/);
});

test("the Site tag is the game's address on meaf.us, and the review links back to it", () => {
  const site = (gameID?: string) => parseRecord(meafRecord({ ...base, gameID })).tags.Site;
  const page = "https://meaf.us/sst1/?game=abc123&spectate=1";
  assert.equal(site("abc123"), page);
  assert.deepEqual(gamePage({ Site: page }), { href: page, host: "meaf.us" });
  assert.equal(site("a b&c/d"), "https://meaf.us/sst1/?game=a%20b%26c%2Fd&spectate=1");
  // A game with no id has the site's name, which gives no link (partners.test.ts).
  assert.equal(site(undefined), "meaf.us");
  assert.equal(site(""), "meaf.us");
});
