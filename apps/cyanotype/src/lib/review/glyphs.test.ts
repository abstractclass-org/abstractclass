import { test } from "node:test";
import assert from "node:assert/strict";
import { nameSize } from "@abstractclass/review/nameSize.ts";
import { parseMove } from "../game/notation.ts";
import type { Hand, Kind } from "../board/position.ts";
import { asPlayed, glyphOf, playedText, shortNote, turnShortNote, type GlyphPart, type MoveReview, type Played, type Position,
         type Step, type TurnReview } from "./blueprints.ts";
import { NAME_LEAST } from "./table.ts";

// The display setting `notation`: a move in its text (playedText) and in its glyphs (glyphOf, which MoveLabel.svelte
// draws), from moves of the review's test game (fixtures/stamp-duty.txt, turns 1 to 4). And the candidates' table's
// least size (table.ts).

const EMPTY: Hand = [{}, {}, {}];
const step = (captured: Step["captured"] = {}, points = 0): Step =>
  ({ footprint: [], captured, points, blueprints: [EMPTY, EMPTY], stars: [0, 0] });
/** A move played: its name, what it did, and for an edit the kind of the cell that the board draws. */
const played = (name: string, did: Step = step(), kind: Kind = "plain"): Played => {
  const edge = name === "pass" ? null : parseMove(name);
  const drawn = !edge ? { type: "pass" as const, player: 0 as const }
    : edge.kind === "edit" ? { type: "edit" as const, player: 0 as const, kind, from: { blueprint: edge.from.blueprint, hex: [edge.from.q, edge.from.r] as [number, number] },
                               to: { blueprint: edge.to.blueprint, hex: [edge.to.q, edge.to.r] as [number, number] } }
    : { type: "place" as const, player: 0 as const, blueprint: edge.blueprint, at: [edge.q, edge.r] as [number, number], footprint: [], captured: [] };
  return { player: 0, edge, did, drawn } as Played;
};

test("each move in its text and in its glyphs, with the same marks", () => {
  const cases: [Played, string, GlyphPart[]][] = [
    [played("2@1,-5"), "2@1,-5", [{ kind: "box", n: 2 }, { kind: "place", text: "1,-5" }]],
    [played("2@6,-5", step({ "7,-5": [1, "plain"] })), "2@6,-5x", [{ kind: "box", n: 2 }, { kind: "place", text: "6,-5" }, { kind: "x" }]],
    [played("2@3,-7", step({ "4,-7": [0, "plain"] }, 10)), "2@3,-7x+10",
     [{ kind: "box", n: 2 }, { kind: "place", text: "3,-7" }, { kind: "points", points: 10 }]],
    [played("1:-1,1>2:0,-1", step(), "star"), "1:-1,1>2:0,-1",
     [{ kind: "cell", cell: "star" }, { kind: "box", n: 1 }, { kind: "place", text: "-1,1" }, { kind: "arrow" },
      { kind: "box", n: 2 }, { kind: "place", text: "0,-1" }]],
    [played("pass"), "pass", [{ kind: "pass" }]],
  ];
  for (const [m, text, glyphs] of cases) {
    assert.equal(playedText(m), text);
    assert.deepEqual(glyphOf(m), glyphs, text);
  }
});

test("a capture that scores nothing has its x in the glyphs too", () => {
  const m = played("2@6,-5", step({ "7,-5": [1, "plain"] }));
  assert.match(playedText(m), /x$/);
  assert.deepEqual(glyphOf(m).at(-1), { kind: "x" });
});

test("a candidate has no capture mark, in either form", () => {
  const hands: [Hand, Hand] = [[{ "-1,1": "star" }, {}, {}], EMPTY];
  const before = { blueprints: hands, stars: [0, 0] as [number, number] };
  const place = asPlayed(parseMove("2@6,-5"), 0, before), edit = asPlayed(parseMove("1:-1,1>2:0,-1"), 0, before);
  assert.equal(playedText(place), "2@6,-5");
  assert.ok(!glyphOf(place).some(p => p.kind === "x" || p.kind === "points"));
  // An edit's glyphs take its cell's kind from the hands before it
  assert.deepEqual(glyphOf(edit)[0], { kind: "cell", cell: "star" });
});

test("a note's moves are moves played, which the lists write by the setting", () => {
  const before = { player: 0, blueprints: [EMPTY, EMPTY], stars: [0, 0] } as unknown as Position;
  const e = { label: "mistake", player: 0, edge: parseMove("2@1,-5"), best: { edge: parseMove("2@6,-5") } } as unknown as MoveReview;
  const note = shortNote(e, before);
  assert.ok(Array.isArray(note));
  const best = note.find(p => typeof p !== "string") as Played;
  assert.equal(playedText(best), "2@6,-5");
  assert.deepEqual(glyphOf(best), [{ kind: "box", n: 2 }, { kind: "place", text: "6,-5" }]);
  assert.equal(note.map(p => (typeof p === "string" ? p : playedText(p))).join(""), "Mistake. 2@6,-5 was best.");
  // By turn: the turn's best moves, each a move played
  const t = { label: "blunder", player: 0, edges: [], best: [parseMove("2@6,-5"), parseMove("2@1,-5")] } as unknown as TurnReview;
  const turnNote = turnShortNote(t, before);
  assert.ok(Array.isArray(turnNote));
  assert.equal(turnNote.map(p => (typeof p === "string" ? p : playedText(p))).join(""), "Blunder. 2@6,-5 2@1,-5 was best.");
});

test("a turn note's second edit has its cell only where the hands before it are known", () => {
  // Blue's hand at the turn's start: a star at 1:-1,1 and a wall at 1:0,2
  const before = { player: 0, blueprints: [[{ "-1,1": "star", "0,2": "wall" }, {}, {}], EMPTY], stars: [0, 0] } as unknown as Position;
  const note = (best: string[]) => {
    const t = { label: "mistake", player: 0, edges: [], best: best.map(parseMove) } as unknown as TurnReview;
    return (turnShortNote(t, before) as (string | Played)[]).filter(p => typeof p !== "string").map(p => glyphOf(p as Played)[0]);
  };
  // After a placement, the hands are as at the turn's start: the edit's cell is the wall
  assert.deepEqual(note(["2@6,-5", "1:0,2>2:0,3"])[1], { kind: "cell", cell: "wall" });
  // After an edit, the hands have changed, and the note does not know them: the second edit has no cell
  assert.deepEqual(note(["1:-1,1>2:0,-1", "1:0,2>2:0,3"]).map(g => g.kind), ["cell", "box"]);
});

test("the table's least size is 65%: the archive's longest edit fits as text at 1,376 pixels, not as glyphs", () => {
  assert.equal(NAME_LEAST, 0.65);
  // Measured in Chromium, in the move list's monospaced font: 142.8 pixels as text and 172 as glyphs at full size, in
  // a cell of 93 pixels at 1,376 x 952
  const text = nameSize(93, 142.8, NAME_LEAST), glyphs = nameSize(93, 172, NAME_LEAST);
  assert.equal(text, 0.651);
  assert.ok(142.8 * text <= 93);
  assert.equal(glyphs, NAME_LEAST);
  assert.ok(172 * glyphs > 93);
});
