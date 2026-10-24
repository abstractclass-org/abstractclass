// Checks the record's frame with a test game unlike Enclosure (design 29): its moves are words, their one spelling in
// lower case, and its mark `#N` counts what a move takes (`apple#2`), never `#0`. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { markMoves, readRecord, RecordError, writeRecord, type Notation } from "./record.ts";

/** The test game: its mark is what a move takes, or null for none. A set-up start gives its first turn's label in a
 *  `Start` tag: `3.`, or `2...` for a turn's second move. */
const words: Notation<number | null> = {
  read(word) {
    const m = /^([a-z]+)(?:#(\d+))?$/i.exec(word);
    if (!m) return "not a word, a turn label or a result";
    if (m[2] === "0") return "a move that takes nothing has no mark";
    return { name: m[1].toLowerCase(), mark: m[2] ? Number(m[2]) : null, markAt: m[1].length };
  },
  mark: n => (n === null ? "" : `#${n}`),
  none: null,
  start: tags => ({ turn: parseInt(tags.Start ?? "1"), first: !tags.Start?.endsWith("...") }),
};
const read = (text: string) => readRecord(text, words);

test("the game's moves in their one spelling, its marks, a pass, and the result", () => {
  const r = read("1. Apple 2. bee#2 cat 3. PASS dog b+12");
  assert.deepEqual(r.moves, ["apple", "bee", "cat", "pass", "dog"]);
  assert.deepEqual(r.marked, [null, 2, null, null, null]);
  assert.equal(r.result, "b+12");
});

test("tags, evaluations and clocks in comments", () => {
  const r = read(`[Event "Casual"]\n[Blue "a \\"quoted\\" name"]\n\n1. apple { [%eval 0.55 +95 205] } 2. bee { [%clk 0:00:41] } cat *`);
  assert.equal(r.tags.Blue, 'a "quoted" name');
  assert.deepEqual(r.evals, [{ blueWin: 0.55, margin: 95, spread: 205 }, null, null]);
  assert.deepEqual(r.clocks, [null, "0:00:41", null]);
});

test("branches are skipped, and a turn label can touch its first move", () => {
  const r = read("1.apple 2. bee cat (2. dog emu (2... fox)) 3. gnu *");
  assert.deepEqual(r.moves, ["apple", "bee", "cat", "gnu"]);
});

test("quality marks: read after any move, a pass or a mark, and dropped", () => {
  const r = read("1. apple! 2. bee#3?! cat?? 3. pass? *");
  assert.deepEqual(r.moves, ["apple", "bee", "cat", "pass"]);
  assert.deepEqual(r.marked, [null, 3, null, null]);
});

test("the game's marks are written after a move, before its quality mark, where the record has none", () => {
  const text = "1. apple?? 2. bee#3 cat { [%clk 0:00:41] } 3. PASS dog *";
  assert.equal(markMoves(text, read(text), [4, 3, 1, null, null], words),
               "1. apple#4?? 2. bee#3 cat#1 { [%clk 0:00:41] } 3. PASS dog *");
});

test("the first turn's number comes from the game's start", () => {
  assert.deepEqual(read('[Start "3."]\n\n3. apple bee 4. cat *').moves, ["apple", "bee", "cat"]);
  assert.deepEqual(read('[Start "2..."]\n\n2... apple 3. bee *').moves, ["apple", "bee"]);
  assert.throws(() => read('[Start "3."]\n\n1. apple *'), /turn 1\. where the notation gives turn 3\./);
  assert.throws(() => read("1... apple *"), /turn 1\.\.\. where the notation gives turn 1\./);
});

test("a game with no set-up start refuses a Position tag, at the tag", () => {
  const standard: Notation<number | null> = { ...words, start: undefined };
  const refused = (text: string) => {
    try { readRecord(text, standard); } catch (e) { assert.ok(e instanceof RecordError); return [e.message, e.offset]; }
    assert.fail(`no error: ${text}`);
  };
  const message = "this site reads a game from the standard start only: remove the Position tag";
  assert.deepEqual(refused('[Event "x"]\n[Position "something"]\n\n5. apple *'), [message, 12]); // before the turn's number
  assert.deepEqual(refused('[Position "something"]\n\napple'), [message, 0]);
  assert.deepEqual(readRecord('[Position "?"]\n[Round "-"]\n\n1. apple *', standard).moves, ["apple"]);
  assert.deepEqual(read('[Position "something"]\n\n1. apple *').moves, ["apple"]); // a game with a start reads it
});

test("errors name what is wrong and where", () => {
  const at = (text: string) => {
    try { read(text); } catch (e) { assert.ok(e instanceof RecordError); return [e.message, e.offset]; }
    assert.fail(`no error: ${text}`);
  };
  assert.deepEqual(at("1. apple 2. bee b4"), ["not a word, a turn label or a result: b4", 16]);
  assert.deepEqual(at("1. apple#0!"), ["a move that takes nothing has no mark: apple#0!", 3]);
  assert.deepEqual(at("1. apple 3. bee"), ["the record gives turn 3 where the notation gives turn 2", 9]);
  assert.deepEqual(at("1. apple *  2. bee"), ["nothing may follow the result (*)", 12]);
  assert.deepEqual(at('1. apple [Blue "x"]'), ["tags come before the moves", 9]);
  assert.deepEqual(at("1. apple (2. bee"), ["a ( has no closing )", 16]);
  assert.deepEqual(at(""), ["the record has no moves", 0]);
});

test("a record written and read back", () => {
  const moves = ["apple", "bee#2", "cat", "pass", "dog"];
  const text = writeRecord({ Blue: "ann", Red: "bob" }, moves, [{ number: 1, moves: 1 }, { number: 2, moves: 2 }, { number: 3, moves: 2 }], "r+R");
  assert.match(text, /^\[Event "\?"\]\n\[Site "\?"\]\n\[Date "\?\?\?\?\.\?\?\.\?\?"\]\n\[Round "-"\]\n\[Blue "ann"\]\n\[Red "bob"\]\n\[Result "r\+R"\]\n\n1\. apple 2\. bee#2 cat 3\. pass dog r\+R\n$/);
  const r = read(text);
  assert.deepEqual([r.moves, r.marked, r.result], [["apple", "bee", "cat", "pass", "dog"], [null, 2, null, null, null], "r+R"]);
});
