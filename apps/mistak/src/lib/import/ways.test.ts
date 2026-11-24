// Checks the ways in (ways.ts): a playtak game's number, a ptn.ninja link and pasted PTN, and the links back. The records
// and the numbers are ours, and a fake request takes the place of the site's Function. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import lz from "lz-string";
import { bringGame, bringPlaytak, bringRecord, playtakPage, playtakRecord, ptnNinjaLink, readWay } from "./ways.ts";

const PTN = `[Player1 "Ann Example"]
[Player2 "Bob Example"]
[Size "6"]
[Komi "2"]

1. a1 f6
2. b1 c4 *
`;
const PLAIN = "text/plain; charset=utf-8";

/** A request that answers with a status, a body and a type, and keeps the addresses. */
function request(status: number, body: string, type = PLAIN) {
  const asked: string[] = [];
  const fake = (async (address: string) => {
    asked.push(address);
    return new Response(body, { status, headers: { "Content-Type": type } });
  }) as unknown as typeof fetch;
  return { fake, asked };
}
const none = (async () => { throw new Error("no request was to be made"); }) as unknown as typeof fetch;
const problem = async (given: string, fetched: typeof fetch = none) => {
  try { await bringGame(given, fetched); } catch (e) { return (e as Error).message; }
  assert.fail(`taken: ${given}`);
};

test("a playtak game's number is asked of the site's Function, and its record is read", async () => {
  const { fake, asked } = request(200, PTN);
  const { game, text } = await bringGame(" 123 ", fake);
  assert.deepEqual(asked, ["/api/playtak/ptn/123"]);
  assert.deepEqual(game.moves, ["a1", "f6", "b1", "c4"]);
  assert.equal(game.tags.PlayTakID, "123");
  assert.ok(text.startsWith('[PlayTakID "123"]\n'));
});

test("a record that has the PlayTakID tag keeps it", async () => {
  const own = `[PlayTakID "77"]\n${PTN}`;
  assert.equal(await playtakRecord("123", request(200, own).fake), own);
});

test("the number's refusals: none on playtak, no answer, a page in its place, a number that is not one", async () => {
  assert.equal(await problem("123", request(404, "{}", "application/json").fake), "Playtak has no finished game with the number 123.");
  const failed = "The site could not get the game from playtak. Paste the PTN of the game, or try again later.";
  assert.equal(await problem("123", request(502, "").fake), failed);
  assert.equal(await problem("123", request(200, "<!doctype html>", "text/html").fake), failed);
  assert.equal(await problem("123", (async () => { throw new TypeError("no connection"); }) as unknown as typeof fetch), failed);
  for (const bad of ["012", "12345678901"])
    assert.equal(await problem(bad), "The number of a playtak game has 1 to 10 digits, and does not start with 0.");
});

test("a fetched game is refused as pasted PTN is, without a line in a text that the player did not see", async () => {
  const eight = PTN.replace('[Size "6"]', '[Size "8"]');
  assert.equal(await problem("123", request(200, eight).fake),
               "The engine learned the sizes 5 × 5 and 6 × 6 only, so the site does not take a game of another size: 8.");
});

test("pasted PTN is read, with the result * and with none", async () => {
  assert.equal((await bringGame(PTN, none)).game.result, "*");
  assert.equal((await bringGame(PTN.replace(" *", ""), none)).game.result, null);
});

test("a pasted record's refusal says where the problem is", async () => {
  assert.equal(await problem(PTN.replace('[Size "6"]', '[Size "8"]')),
               "The engine learned the sizes 5 × 5 and 6 × 6 only, so the site does not take a game of another size: 8 (line 3, column 1).");
  assert.match(await problem("hello"), /^[A-Z].*\(line 1, column \d+\)\.$/);
});

test("a ptn.ninja link is read from its path, packed or plain, and its other parts change nothing", async () => {
  const packed = lz.compressToEncodedURIComponent(PTN);
  for (const link of [`https://ptn.ninja/${packed}`, `ptn.ninja/${packed}`, `http://www.ptn.ninja/${packed}&ply=3&theme=x`,
                      `https://ptn.ninja/${packed}&name=abc!`, `https://ptn.ninja/${encodeURI(PTN)}`,
                      `https://ptn.ninja/${encodeURIComponent(PTN)}&ply=2!`])
    assert.equal((await bringGame(link, none)).text, PTN, link);
});

test("a ptn.ninja link's refusals: a short link, no game, and text that is not a record", async () => {
  assert.match(await problem("https://ptn.ninja/s/abc123"), /short link of PTN Ninja/);
  assert.equal(await problem("https://ptn.ninja/"), "This link of PTN Ninja holds no game.");
  assert.equal(await problem("ptn.ninja"), "This link of PTN Ninja holds no game.");
  assert.equal(await problem("https://ptn.ninja/%E0%A4%A"), "The site cannot read the game in this link.");
  assert.ok(await problem("https://ptn.ninja/QQQQ")); // packed text that holds no record
});

test("another link is not read", async () => {
  assert.equal(await problem("https://playtak.com/games/123/ninjaviewer"),
               "The site reads links of PTN Ninja only. For a playtak game, type the number of the game.");
});

test("what a text is", () => {
  assert.deepEqual(readWay("123"), { way: "playtak", id: "123" });
  assert.equal(readWay(PTN).way, "pasted");
});

test("the links back: the game's page on playtak by its tag, and the record in PTN Ninja", async () => {
  assert.equal(playtakPage({ PlayTakID: "123" }), "https://playtak.com/games/123/playtakviewer");
  const untagged: Record<string, string>[] = [{}, { PlayTakID: "" }, { PlayTakID: "x/../y" }, { PlayTakID: "0" }];
  for (const tags of untagged) assert.equal(playtakPage(tags), null);
  assert.equal((await bringGame(ptnNinjaLink(PTN), none)).text, PTN);
});

test("an address's number is a number only, and its record is a record only", async () => {
  assert.equal((await bringPlaytak("123", request(200, PTN).fake)).game.tags.PlayTakID, "123");
  for (const bad of ["", "abc", "1/2", "../x", PTN])
    await assert.rejects(bringPlaytak(bad, none), /The number of a playtak game/);
  assert.throws(() => bringRecord("123", true));
});
