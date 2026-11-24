// Checks Tak's game record in PTN (record.ts) and the komi limit of each size (komi.ts). The records are written by hand
// for these tests or are the examples of ptn.ninja's documents: none is a game that was played. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { komiLimit } from "./komi.ts";
import { markFlattenings, openingOf, parseRecord, RecordError, startOf, writeRecord } from "./record.ts";

const refused = (text: string): [string, number] => {
  try { parseRecord(text); } catch (e) { assert.ok(e instanceof RecordError, String(e)); return [e.message, e.offset]; }
  assert.fail(`no error: ${text}`);
};
const SIX = '[Size "6"]\n\n';

// Records in the form that writeRecord writes: each is read and written back as the same text.
const RECORDS: Record<string, string> = {
  "a swap opening and a road win": `[Player1 "Ann Example"]
[Player2 "Bob Example"]
[Result "R-0"]
[Size "5"]

1. e1 a1
2. a2 e2
3. a3 e3
4. a4 e4
5. a5 R-0
`,
  "a flat win with komi": `[Date "2026.11.24"]
[Player1 "Ann Example"]
[Rating1 "1500"]
[Player2 "Bob Example"]
[Rating2 "1600"]
[Result "0-F"]
[Size "6"]
[Komi "2.5"]
[Opening "swap"]

1. a1 f6
2. Sb2 Cc3
3. b1 c4 0-F
`,
  "a draw of the 50-ply rule, in which a wall is flattened": `[Result "1/2-1/2"]
[Size "6"]
[Komi "0"]

1. a1 f6
2. Cb2 Sb3
3. b2+* f6-
4. b3- f5+
5. b2+ f6- 1/2-1/2
`,
  "an unfinished game that ends with White's move": `[Site "PlayTak.com"]
[Size "6"]
[PlayTakID "1"]

1. a1 f6
2. 3b2+12 *
`,
  "a set-up start with Black to move": `[Size "5"]
[TPS "x5/x5/x2,1,x2/x5/x5 2 4"]

4. -- a1
5. b1 c1
6. d1 F-0
`.replace('[Size', '[Result "F-0"]\n[Size'),
  "a double black stack": `[Result "0-1"]
[Size "6"]
[Opening "double black stack"]

1. 2a1 f6
2. b2 b3 0-1
`,
  "a tag that PTN does not name": `[Result "1-0"]
[Size "6"]
[Annotator "Ann Example"]

1. a1 f6 1-0
`,
};

for (const [what, text] of Object.entries(RECORDS))
  test(`written and read back unchanged: ${what}`, () => assert.equal(writeRecord(parseRecord(text)), text));

test("the moves, the marks and the result of a record", () => {
  const draw = parseRecord(RECORDS["a draw of the 50-ply rule, in which a wall is flattened"]);
  assert.deepEqual(draw.moves.slice(2, 6), ["Cb2", "Sb3", "b2+", "f6-"]);
  assert.deepEqual(draw.marked.slice(2, 6), [false, false, true, false]);
  assert.equal(draw.result, "1/2-1/2");
  assert.equal(parseRecord(RECORDS["a flat win with komi"]).komi, 2.5);
  assert.equal(parseRecord(RECORDS["an unfinished game that ends with White's move"]).result, "*");
  assert.equal(parseRecord(SIX + "1. a1 f6").result, null);
});

test("playtak's form: explicit counts and drops, its tags in its order, the result on its own line", () => {
  const r = parseRecord(`[Site "PlayTak.com"]
[Event "Online Play"]
[Date "2026.11.24"]
[Time "12:00:00"]
[Player1 "Ann Example"]
[Player2 "Bob Example"]
[Clock "10:00 +5"]
[Result "0-0"]
[Size "6"]
[Komi "2"]
[Flats "30"]
[Caps "1"]

1. a1 f6
2. Cb2 Sb3
3. 1b2+1* 1f6-1
4. 2b3-11
0-0
`);
  assert.deepEqual(r.moves, ["a1", "f6", "Cb2", "Sb3", "b2+", "f6-", "2b3-11"]);
  assert.deepEqual([r.marked[4], r.result, r.komi], [true, "*", 2]);
  // Written, it is the short form, with no Result tag for a game with no result.
  assert.match(writeRecord(r), /\n1\. a1 f6\n2\. Cb2 Sb3\n3\. b2\+\* f6-\n4\. 2b3-11 \*\n$/);
  assert.doesNotMatch(writeRecord(r), /Result/);
});

test("ptn.ninja's document: its tags, its turns and its branches", () => {
  const r = parseRecord(`[Size "6"]
[Opening "swap"]

1. a1 b1
2. a2 b2
3. a3 b3
4. a4 b4

{3w1}
3. c1 b3
4. c2 b4

{3w1/4w1}
4. d1 b4
5. d2 b5
`);
  assert.deepEqual(r.moves, ["a1", "b1", "a2", "b2", "a3", "b3", "a4", "b4"]);
});

test("each spelling is read as the short form, and comments and marks leave the moves as they are", () => {
  const r = parseRecord(`[size "6"]\n[KOMI "2"]\n\n{a first note} 1. Fa1 F6! {a note (with parens)} 2. sB2??` +
                        `\n2... cc3'' 3. 1a1+1 4f6-4"\n4. 3c3>12* f1 r-0`);
  assert.deepEqual(r.moves, ["a1", "f6", "Sb2", "Cc3", "a1+", "4f6-", "3c3>12", "f1"]);
  assert.deepEqual([r.komi, r.result, r.tags.Size], [2, "R-0", "6"]);
});

test("results: each of PTN's, from the moves' end or from the tag", () => {
  for (const [word, result] of [["R-0", "R-0"], ["0-R", "0-R"], ["F-0", "F-0"], ["0-F", "0-F"], ["1-0", "1-0"], ["0-1", "0-1"],
                                ["1/2-1/2", "1/2-1/2"], ["1/2", "1/2-1/2"], ["*", "*"], ["0-0", "*"], ["0-f", "0-F"]]) {
    assert.equal(parseRecord(`${SIX}1. a1 f6 ${word}`).result, result, word);
    assert.equal(parseRecord(`[Result "${word}"]${SIX}1. a1 f6`).result, result === "*" ? null : result, word);
  }
  assert.equal(refused(`[Result "R-0"]${SIX}1. a1 f6 0-R`)[0], "the Result tag (R-0) is not the result that ends the moves (0-R)");
  assert.equal(refused(`${SIX}1. a1 f6 b+12`)[0], "not a move, a number or a result: b+12");
});

test("the double black stack: 2a1 is its first move alone", () => {
  const stack = (text: string) => `[Size "6"]\n[Opening "Double Black Stack"]\n\n${text}`;
  for (const text of ["1. 2a1 f6", "1. a1 f6", "1. 2A1 f6"]) assert.deepEqual(parseRecord(stack(text)).moves, ["a1", "f6"]);
  assert.deepEqual(parseRecord(stack("1. 2a1! f6")).moves, ["a1", "f6"]);
  assert.equal(refused(SIX + "1. 2a1 f6")[0], "a placement has no count: 2a1"); // the swap opening places one
  assert.equal(refused(stack("1. 2a1 2f6"))[0], "a placement has no count: 2f6");
  assert.equal(refused(stack("1. 3a1 f6"))[0], "a placement has no count: 3a1");
  assert.equal(refused(stack("1. 2a1 f6").replace("\n\n", '\n[TPS "x6/x6/x6/x6/x6/x5,1 1 2"]\n\n').replace("1. ", "2. "))[0],
               "a placement has no count: 2a1");
});

test("the start: the size's empty board, or the TPS tag's in its one spelling", () => {
  assert.equal(startOf(parseRecord('[Size "5"] 1. a1').tags), "x5/x5/x5/x5/x5 1 1");
  assert.equal(startOf(parseRecord('[TPS "x2,x/x3/X3 2 3"] 3. -- a1').tags), "x3/x3/x3 2 3");
  // The size is the TPS's without a Size tag, and the first number is the TPS's.
  assert.equal(refused('[TPS "x5/x5/x5/x5/x5 1 3"]\n\n1. a1')[0], "the record gives number 1 where the notation gives 3");
  assert.deepEqual(parseRecord('[TPS "x5/x5/x5/x5/x5 2 3"]\n\n3... a1 4. b1').moves, ["a1", "b1"]);
});

test("the opening: swap without a tag, in any case", () => {
  assert.equal(openingOf({}), "swap");
  assert.equal(openingOf({ Opening: "?" }), "swap");
  assert.equal(openingOf({ Opening: "No-Swap" }), "no-swap");
  assert.equal(openingOf({ Opening: "other" }), null);
});

test("a wrong record is refused, at the tag or the move that is wrong", () => {
  assert.deepEqual(refused("1. a1 f6"), ['the record must have a Size tag, such as [Size "6"]', 0]);
  assert.deepEqual(refused('[Site "x"]\n[Size "9"]\n\n1. a1'), ["the Size tag must be a number from 3 to 8: 9", 11]);
  assert.equal(refused('[Size "6"]\n[TPS "x5/x5/x5/x5/x5 1 1"]\n\n1. a1')[0], "the Size tag is not the size of the TPS tag's board (5): 6");
  assert.equal(refused('[TPS "x5"]\n\n1. a1')[0], "a position must look like x5/x5/x5/x5/x5 1 1: x5");
  assert.equal(refused('[Size "6"]\n[Opening "other"]\n\n1. a1')[0], "the Opening tag must be one of swap, no-swap, double black stack: other");
  assert.equal(refused('[Size "6"]\n[Position "x"]\n\n1. a1')[0], "a Tak record gives its start in a TPS tag, not in a Position tag: x");
  assert.equal(refused(SIX)[0], "the record has no moves");
  assert.deepEqual(refused(SIX + "1. a1 f6 2. 3c3>11"), ["the move takes 3 and drops 2: 3c3>11", SIX.length + 12]);
  assert.equal(refused(SIX + "1. a1 f6 2. a2*")[0], "only a stack move flattens a wall (*): a2*");
  assert.equal(refused(SIX + "1. a1 f6 3. a2")[0], "the record gives number 3 where the notation gives 2");
  assert.equal(refused(SIX + "1. a1 pass")[0], "not a move, a number or a result: pass");
  // The rules are the engine's: a move that no position allows is a move here.
  assert.deepEqual(parseRecord('[Size "5"] 1. h8 Ch8 2. h8> h8').moves, ["h8", "Ch8", "h8>", "h8"]);
});

test("the komi: half flats within the limit of the record's size", () => {
  assert.equal(parseRecord(`[Size "6"]\n[Komi "0.5"]\n\n1. a1`).komi, 0.5);
  assert.equal(parseRecord(`[Komi "5"]\n[Size "6"]\n\n1. a1`).komi, 5); // the size after the komi
  assert.deepEqual(refused('[Komi "5"]\n[Size "5"]\n\n1. a1'), ["the Komi tag must be from -3 to 3 flats: 5", 0]);
  assert.equal(refused('[Komi "5.5"]\n[Size "6"]\n\n1. a1')[0], "the Komi tag must be from -5 to 5 flats: 5.5");
  assert.equal(refused('[Komi "4"]\n[TPS "x5/x5/x5/x5/x5 1 1"]\n\n1. a1')[0], "the Komi tag must be from -3 to 3 flats: 4");
  assert.equal(refused('[Komi "0.25"]\n[Size "6"]\n\n1. a1')[0],
    'the Komi tag must be a number of flats, whole or half, such as "2" or "-2": 0.25');
  // A board's check and the record's read one table.
  assert.equal(komiLimit("x5/x5/x5/x5/x5 1 1"), 3);
  assert.equal(komiLimit("x6/x6/x6/x6/x6/x5,1 2 7"), 5);
  assert.equal(komiLimit("x7/x7/x7/x7/x7/x7/x7 1 1"), Infinity); // refused for its size, before the review
  assert.equal(komiLimit(null), 3);
});

test("a flattening's mark goes where the record has none, before the evaluation marks", () => {
  const text = SIX + "1. a1 f6 2. Cb2 Sb3 3. 1b2+1! f6-";
  const r = parseRecord(text);
  assert.equal(markFlattenings(text, r, [false, false, false, false, true, false]), text.replace("1b2+1!", "1b2+1*!"));
});

test("a tag's value has no escapes: a quote is written as two apostrophes", () => {
  const text = writeRecord({ tags: { Size: "6", Player1: 'Ann "A" Example' }, moves: ["a1"], marked: [false], result: null });
  assert.equal(text, '[Player1 "Ann \'\'A\'\' Example"]\n[Size "6"]\n\n1. a1 *\n');
  assert.equal(parseRecord('[Size "6"] [Event "a \\ b"] 1. a1').tags.Event, "a \\ b");
});
