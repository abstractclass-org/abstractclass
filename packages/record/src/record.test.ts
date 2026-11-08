// Checks the record's frame with a test game unlike Enclosure (design 29): its moves are words, their one spelling in
// lower case, and its mark `#N` counts what a move takes (`apple#2`), never `#0`. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isKomi, komiLimitProblem, komiOf, komiPrefix, komiRange, markMoves, pastedError, readRecord, RecordError, setUpRefusal, startTags, withStartTag, withTags,
  writeRecord, writeTags, type Notation,
} from "./record.ts";

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
  // The frame numbers the turns and leaves their length to the game: one move a turn reads too.
  assert.deepEqual(read("1. apple 2. bee 3. cat *").moves, ["apple", "bee", "cat"]);
});

test("tags, evaluations and clocks in comments", () => {
  const r = read(`[Event "Casual"]\n[Blue "a \\"quoted\\" name"]\n\n1. apple { [%eval 0.55 +95 205] } 2. bee { [%clk 0:00:41] } cat *`);
  assert.equal(r.tags.Blue, 'a "quoted" name');
  assert.deepEqual(r.evals, [{ blueWin: 0.55, margin: 95, spread: 205 }, null, null]);
  assert.deepEqual(r.clocks, [null, "0:00:41", null]);
});

test("variations are skipped, and a turn label can touch its first move", () => {
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

test("the Komi tag: Red's starting score, 0 without it, and an error where it is not a komi", () => {
  assert.equal(read("1. apple *").komi, 0);
  assert.equal(read('[Komi "300"]\n\n1. apple *').komi, 300);
  assert.equal(read('[Komi "-120.5"]\n\n1. apple *').komi, -120.5);
  assert.equal(read('[Komi "+7"]\n\n1. apple *').komi, 7);
  for (const none of ["", "?", "-", "0", "-0"]) assert.equal(read(`[Komi "${none}"]\n\n1. apple *`).komi, 0);
  for (const bad of ["6.25", "abc", "1e3", "300 points", "123456"]) {
    assert.throws(() => read(`[Event "x"]\n[Komi "${bad}"]\n\n1. apple *`),
                  (e: unknown) => e instanceof RecordError && e.offset === 12 && e.message.includes("Komi"));
  }
  assert.equal(komiOf("nonsense"), null);
});

test("a komi's limit in the site's numbers, and why a komi passes it", () => {
  assert.equal(komiRange(90_980), "from -90,980 to 90,980 points");
  assert.equal(komiLimitProblem(5052, 5052), null);
  assert.equal(komiLimitProblem(-5052, 5052), null);
  assert.equal(komiLimitProblem(5052.5, 5052), "the Komi tag must be from -5,052 to 5,052 points");
  assert.equal(komiLimitProblem(-6000, 5052, "the file's komi"), "the file's komi must be from -5,052 to 5,052 points");
  assert.equal(komiLimitProblem(99_999, undefined), null); // no limit: what a tag can give
});

test("a game's limit on the komi: a Komi tag beyond it is an error that names the limit, thousands separated", () => {
  const limited = (text: string) => readRecord(text, { ...words, maxKomi: 5000 });
  assert.equal(limited('[Komi "5000"]\n\n1. apple *').komi, 5000);
  assert.equal(limited('[Komi "-5000"]\n\n1. apple *').komi, -5000);
  for (const beyond of ["5000.5", "-5001", "99999"]) {
    assert.throws(() => limited(`[Event "x"]\n[Komi "${beyond}"]\n\n1. apple *`),
                  (e: unknown) => e instanceof RecordError && e.offset === 12 &&
                    e.message === `the Komi tag must be from -5,000 to 5,000 points: ${beyond}`);
  }
  // A value that is not a komi keeps its own error, and a game without a limit takes what the reader takes.
  assert.throws(() => limited('[Komi "abc"]\n\n1. apple *'), /whole or half/);
  assert.equal(read('[Komi "99999"]\n\n1. apple *').komi, 99999);
});

test("isKomi: a number that a Komi tag can give, whole or half points", () => {
  for (const n of [0, 300, -300, 120.5, -0.5, 99999.5]) assert.equal(isKomi(n), true, String(n));
  for (const n of [6.25, 1e6, NaN, Infinity, "300", null, undefined]) assert.equal(isKomi(n), false, String(n));
});

test("setUpRefusal: the site's name in the text that sends a set-up start to the Analysis board", () => {
  assert.equal(setUpRefusal("A site"),
    "This game starts from another position. A site reviews games from the standard start only: open it on the Analysis board.");
});

test("startTags: a set-up start's Position tag, then a komi's Komi tag, each only when there is one", () => {
  // None at komi 0, so that a game at 0 records as before the komi.
  assert.deepEqual(startTags(null, 0), {});
  assert.deepEqual(startTags(undefined), {});
  assert.deepEqual(startTags("a b c", 0), { Position: "a b c" });
  assert.deepEqual(startTags(null, -300), { Komi: "-300" });
  assert.deepEqual(Object.entries(startTags("a b c", 300)), [["Position", "a b c"], ["Komi", "300"]]);
});

test("withTags: tags before a text in their order, in the form that writeTags writes, each followed by its separator", () => {
  assert.equal(withTags("apple", startTags("a b", -300)), '[Position "a b"]\n[Komi "-300"]\napple');
  assert.equal(withTags("apple bee", startTags(null, 120.5), " "), '[Komi "120.5"] apple bee');
  assert.equal(withTags("apple", {}), "apple");
  // A quote or a backslash in a value is escaped, as writeTags escapes it, and the reader reads it back.
  const odd = 'a "b" \\c';
  assert.equal(withTags("", { Event: odd }, ""), writeTags({ Event: odd }).split("\n")[0]);
  assert.equal(read(withTags("1. apple *", { Event: odd })).tags.Event, odd);
});

test("komiPrefix: what a game's id covers before its moves at a komi, nothing at komi 0", () => {
  assert.equal(komiPrefix(0), "");
  assert.equal(komiPrefix(-300), "komi -300 | ");
  assert.equal(komiPrefix(120.5), "komi 120.5 | ");
});

test("a record written and read back", () => {
  const moves = ["apple", "bee#2", "cat", "pass", "dog"];
  const text = writeRecord({ Blue: "ann", Red: "bob" }, moves, [{ number: 1, moves: 1 }, { number: 2, moves: 2 }, { number: 3, moves: 2 }], "r+R");
  assert.match(text, /^\[Event "\?"\]\n\[Site "\?"\]\n\[Date "\?\?\?\?\.\?\?\.\?\?"\]\n\[Round "-"\]\n\[Blue "ann"\]\n\[Red "bob"\]\n\[Result "r\+R"\]\n\n1\. apple 2\. bee#2 cat 3\. pass dog r\+R\n$/);
  const r = read(text);
  assert.deepEqual([r.moves, r.marked, r.result], [["apple", "bee", "cat", "pass", "dog"], [null, 2, null, null, null], "r+R"]);
});

test("a start given apart becomes the record's Position tag, unless the record has one", () => {
  assert.equal(withStartTag("apple bee", "a start"), '[Position "a start"]\napple bee');
  assert.equal(withStartTag('[Position "its own"]\napple', "a start"), '[Position "its own"]\napple');
  assert.equal(withStartTag("apple", undefined), "apple"); // the standard start
});

test("a pasted record's problem says where it is in the pasted text, without the start's tag", () => {
  const problem = (text: string) => { try { read(text); } catch (e) { return e as RecordError; } throw new Error("read"); };
  const pasted = "apple\nbee 9z", tagged = withStartTag(pasted, "x");
  assert.equal(pastedError(problem(pasted), pasted, pasted).message, "not a word, a turn label or a result: 9z (line 2, column 5).");
  assert.equal(pastedError(problem(tagged), pasted, tagged).message, "not a word, a turn label or a result: 9z (line 2, column 5).");
});
