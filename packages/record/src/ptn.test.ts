// Checks the record's frame in PTN's form (Notation `ptn`), with a test game whose moves are words: two moves a number,
// PTN's tags, results, branches and placeholder. Tak's own moves are Mistak's (apps/mistak/src/lib/game). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { komiLimitProblem, komiRange, readRecord, RecordError, type Notation } from "./record.ts";

/** The test game: a start's number and player in a `Start` tag (`3 2`: the second player at number 3), and one result,
 *  `won`, that also reads in capitals. */
const words: Notation<null> = {
  read: (word, place) => (!/^[a-z]+$/.test(word) ? "not a move" : word === "opens" && !place.first ? "only the first move opens"
    : { name: word, mark: null, markAt: word.length }),
  mark: () => "",
  none: null,
  start: tags => { const [turn, player] = (tags.Start ?? "1 1").split(" "); return { turn: Number(turn), first: player === "1" }; },
  maxKomi: 4,
  komiWords: { unit: "flats", example: "2" },
  ptn: {
    result: word => (["won", "lost", "*"].includes(word.toLowerCase()) ? word.toLowerCase() : null),
    tagName: name => (name.toLowerCase() === "size" ? "Size" : name),
    tagsProblem: tags => (tags.Size === "9" ? { tag: "Size", problem: "no such size" }
      : tags.Size === undefined ? { tag: null, problem: "no size" } : null),
  },
};
const SIZE = '[Size "6"]\n\n';
const read = (text: string, tags = SIZE) => readRecord(tags + text, words);
const refused = (text: string, tags = SIZE): [string, number] => {
  try { readRecord(tags + text, words); } catch (e) { assert.ok(e instanceof RecordError); return [e.message, e.offset - tags.length]; }
  assert.fail(`no error: ${text}`);
};

test("two moves a number, and the record's own number again for the second move", () => {
  assert.deepEqual(read("1. a b 2. c d *").moves, ["a", "b", "c", "d"]);
  assert.deepEqual(read("1. a {said} 1... b\n2. c").moves, ["a", "b", "c"]);
  assert.deepEqual(read("1. a 1. -- b 2. c").moves, ["a", "b", "c"]);
  assert.deepEqual(read("1. a 1. b 2. c").moves, ["a", "b", "c"]);
  assert.deepEqual(read("a b c").moves, ["a", "b", "c"]); // moves alone, with no numbers
  assert.deepEqual(refused("1. a 2. b"), ["the record gives number 2 where the notation gives 1", 5]);
  assert.deepEqual(refused("1. a b 3. c"), ["the record gives number 3 where the notation gives 2", 7]);
  assert.deepEqual(refused("1. a b c"), ["the record gives no number before this move, where the notation gives 2: c", 7]);
  assert.deepEqual(refused("1... a b"), ["the record gives 1... where the notation gives 1.", 0]);
});

test("a start with the second player to move: each way to write its first number", () => {
  for (const text of ["3. -- a 4. b c", "3. a 4. b c", "3... a 4. b c"])
    assert.deepEqual(read(text, '[Size "6"]\n[Start "3 2"]\n\n').moves, ["a", "b", "c"]);
  assert.equal(refused("1. a", '[Size "6"]\n[Start "3 2"]\n\n')[0], "the record gives number 1 where the notation gives 3");
  // The placeholder stands for the first player's move alone, right after a number.
  assert.deepEqual(refused("1. -- a"), ["-- stands for the first player's move, and the next move is that player's", 3]);
  assert.equal(refused("1. a --")[0], "-- comes right after a number");
});

test("the result: the form's own words, at the end or in the Result tag", () => {
  assert.equal(read("1. a b WON").result, "won");
  assert.equal(read("1. a b").result, null);
  assert.equal(read("1. a b", '[Size "6"]\n[Result "Won"]\n\n').result, "won");
  assert.equal(read("1. a b", '[Size "6"]\n[Result "?"]\n\n').result, null);
  // "*" in the tag claims no result, so the moves' end gives it.
  assert.equal(read("1. a b won", '[Size "6"]\n[Result "*"]\n\n').result, "won");
  assert.deepEqual(refused("1. a b lost", '[Size "6"]\n[Result "won"]\n\n'),
                   ["the Result tag (won) is not the result that ends the moves (lost)", 7]);
  assert.deepEqual(refused("1. a b *", '[Size "6"]\n[Result "won"]\n\n'),
                   ["the Result tag (won) is not the result that ends the moves (*)", 7]);
  assert.equal(refused("1. a b", '[Size "6"]\n[Result "b+12"]\n\n')[0], "the Result tag is not a result: b+12");
  assert.deepEqual(refused("1. a b won 2. c"), ["nothing may follow the result (won)", 11]);
  // PTN has no pass: the word goes to the game's reader, as any move's.
  assert.equal(refused("1. a PASS")[0], "not a move: PASS");
});

test("the main line ends where the first branch starts, after the result too", () => {
  const branch = "\n\n{2w1}\n2. x y\n3. z\n\n{2w1/3w1}\n3. q\n";
  assert.deepEqual(read("1. a b 2. c d 3. e" + branch).moves, ["a", "b", "c", "d", "e"]);
  const won = read("1. a b 2. c d won" + branch);
  assert.deepEqual([won.moves, won.result], [["a", "b", "c", "d"], "won"]);
  assert.deepEqual(read("1. a b 2. c d\r\n\r\n{1b1}\r\n\r\n1. -- x").moves, ["a", "b", "c", "d"]);
  assert.deepEqual(read("1. a b 2. c d\n \t\n{2w1}\n2. x y").moves, ["a", "b", "c", "d"]); // a blank line of spaces
  // The main line ends with the first player's move, and the branch gives that player another.
  assert.deepEqual(read("1. a b 2. c\n\n{2w1}\n2. x y").moves, ["a", "b", "c"]);
  assert.deepEqual(read("1. a b 2. c\n\n{a note}\n2. -- d").moves, ["a", "b", "c", "d"]);
  // A comment that the next number follows is a comment of the main line, with a blank line before it or not.
  assert.deepEqual(read("1. a b\n\n{a note}\n2. c d").moves, ["a", "b", "c", "d"]);
  assert.equal(refused("1. a b 2. c d {2w1} 2. x y")[0], "the record gives number 2 where the notation gives 3"); // no blank line
  assert.deepEqual(refused("1. a (1. b) c"), ["not a move: (1.", 5]); // PTN has no variations in ( )
});

test("the tags: a value with no escapes, the form's names, and the form's check once they end", () => {
  assert.equal(read("1. a", '[size "6"]\n\n').tags.Size, "6");
  assert.equal(read("1. a", '[Size "6"][Event "a \\ b"]\n\n').tags.Event, "a \\ b");
  assert.equal(read("1. a", '[Size"6"]\n\n').tags.Size, "6");
  assert.deepEqual(refused("1. a", '[Event "x"]\n[Size "9"]\n\n'), ["no such size: 9", 12 - '[Event "x"]\n[Size "9"]\n\n'.length]);
  assert.deepEqual(refused("1. a", ""), ["no size", 0]);
  assert.deepEqual(refused('1. [Size "9"] a'), ["tags come before the moves", 3]); // each tag is checked
  assert.deepEqual(refused("[Size \"6\"", ""), ["a tag must look like [Name \"value\"]", 0]);
});

test("the game's word for its komi, in each message", () => {
  assert.equal(komiLimitProblem(5, 4, "5", "the Komi tag", "flats"), "the Komi tag must be from -4 to 4 flats: 5");
  assert.equal(refused("1. a", '[Size "6"]\n[Komi "5"]\n\n')[0], "the Komi tag must be from -4 to 4 flats: 5");
  assert.equal(refused("1. a", '[Size "6"]\n[Komi "x"]\n\n')[0],
    'the Komi tag must be a number of flats, whole or half, such as "2" or "-2": x');
});

test("without a word for its komi, a game keeps each message in points", () => {
  // Hedge School's and Cyanotype's pages show these words, Practice's refusal notice too.
  assert.equal(komiRange(5052), "from -5,052 to 5,052 points");
  assert.equal(komiLimitProblem(300.5, 300, "+300.5"), "the Komi tag must be from -300 to 300 points: +300.5");
  assert.equal(komiLimitProblem(-6000, 5052, -6000, "its komi"), "its komi must be from -5,052 to 5,052 points: -6000");
  const plain: Notation<null> = { read: words.read, mark: words.mark, none: null, maxKomi: 300 };
  const says = (komi: string) => {
    try { readRecord(`[Komi "${komi}"]\n\n1. a b`, plain); } catch (e) { return (e as RecordError).message; }
  };
  assert.equal(says("301"), "the Komi tag must be from -300 to 300 points: 301");
  assert.equal(says("x"), 'the Komi tag must be a number of points, whole or half, such as "300" or "-300": x');
  assert.equal(says("300"), undefined);
});

test("a move's place: the game knows the record's first move", () => {
  assert.deepEqual(read("1. opens b").moves, ["opens", "b"]);
  assert.equal(refused("1. a opens")[0], "only the first move opens: opens");
});

test("quality marks are dropped, and PTN's engine notes are comments here", () => {
  const r = read("1. a!? b?? {[%eval 0.5 +1 2] [%clk 0:01]} 2. c!");
  assert.deepEqual([r.moves, r.evals, r.clocks], [["a", "b", "c"], [null, null, null], [null, null, null]]);
});
