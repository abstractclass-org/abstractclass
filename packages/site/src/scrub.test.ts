// Checks the scrubbing of what goes to PostHog (scrub.ts): no game, no record and no name in a report. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hidePlayers, scrubEvent, scrubText } from "./scrub.ts";

/** A record as the sites write it: its tags, with a typed name, then its moves. */
const RECORD = '[Event "Hedge School test game"]\n[Blue "Ann Example"]\n[Red "HedgeFund, 128 visits"]\n\n' +
  "1. A10-D9 2. N11-Q10 K9-N11 3. D9-G10 D10-G9 r+377.651497";
const BLUEPRINTS = "1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 2@6,-5x 2@3,-7x+10";

/** Whether `text` holds any part of a record: a tag's value, a move or a name. */
const leaks = (text: string) => /Ann|Example|HedgeFund|A10|N11|D9|1:-1|2@6|377/.test(text);

test("an address keeps a kept game's id and a place after its #, and loses every other part there", () => {
  assert.equal(scrubText("https://hedgeschool.org/review#game=k2x9"), "https://hedgeschool.org/review#game=k2x9");
  assert.equal(scrubText("https://hedgeschool.org/analysis#game=k2x9&at=4"), "https://hedgeschool.org/analysis#game=k2x9&at=4");
  assert.equal(scrubText("at https://hedgeschool.org/analysis#record=%5BBlue%20%22Ann%22%5D&at=3:1:9"),
               "at https://hedgeschool.org/analysis#…:1:9");
  assert.equal(scrubText("https://cyanotype.abstractclass.org/review#packed=eJyrVkr"), "https://cyanotype.abstractclass.org/review#…");
  assert.equal(scrubText("https://hedgeschool.org/import#tool=bookmarklet&v=7&record=1.%20A10-D9"), "https://hedgeschool.org/import#…");
  // An older tool's bare record, with no parameter's name
  assert.equal(scrubText("https://hedgeschool.org/review#1.%20A10-D9"), "https://hedgeschool.org/review#…");
  assert.equal(scrubText("https://hedgeschool.org/review"), "https://hedgeschool.org/review");
});

test("a record's text loses its tags' values and its moves", () => {
  const scrubbed = scrubText(`the game failed: ${RECORD}`);
  assert.ok(!leaks(scrubbed), scrubbed);
  assert.match(scrubbed, /^the game failed: \[Event "…"\]/);
  assert.ok(!leaks(scrubText(BLUEPRINTS)), scrubText(BLUEPRINTS));
  // The last move takes the full stop after it: a mark too many is safe, a move too few is not.
  assert.equal(scrubText(`moves ${BLUEPRINTS}. Then`), "moves … Then");
});

test("quoted text goes, in each kind of quotes, and a word's apostrophe stays", () => {
  assert.equal(scrubText(`Unexpected token 'A', "Ann's game" is not valid JSON`), `Unexpected token '…', "…" is not valid JSON`);
  assert.equal(scrubText("Cannot read properties of undefined (reading 'name')"), "Cannot read properties of undefined (reading '…')");
  assert.equal(scrubText("the name “Ann” and ‘Bo’ and `Cy`"), "the name “…” and ‘…’ and `…`");
  assert.equal(scrubText("the players' names and Blue's turn"), "the players' names and Blue's turn");
});

test("an engine's message, with no game in it, stays as it is", () => {
  for (const text of [
    "the engine worker failed: RuntimeError: unreachable",
    "https://hedgeschool.org/engine/katago.wasm: HTTP 404",
    "WebAssembly.instantiate(): Out of memory: Cannot allocate Wasm memory for new instance",
    "line 3, column 14 of version 1.447.4, 3.5 MB",
  ]) assert.equal(scrubText(text), text);
});

test("an event's every string is scrubbed, at any depth, and its other values stay", () => {
  const at = new Date(0);
  const event = {
    uuid: "019a8c3e-0000-7000-8000-000000000000", event: "$exception", timestamp: at,
    properties: {
      $current_url: "https://hedgeschool.org/review#record=1.%20A10-D9",
      $exception_list: [{
        type: "Error", value: `cannot read ${RECORD}`, mechanism: { handled: true, synthetic: false },
        stacktrace: { type: "raw", frames: [{ filename: "https://hedgeschool.org/review#record=1.%20A10-D9", lineno: 3, colno: 9, in_app: true }] },
      }],
      error_kind: "load", edges: "1-29", internal: true,
    },
  };
  const scrubbed = scrubEvent(event);
  assert.ok(!leaks(JSON.stringify(scrubbed)), JSON.stringify(scrubbed));
  assert.equal(scrubbed.properties.$current_url, "https://hedgeschool.org/review#…");
  assert.equal(scrubbed.properties.$exception_list[0].stacktrace.frames[0].filename, "https://hedgeschool.org/review#…");
  assert.equal(scrubbed.properties.$exception_list[0].stacktrace.frames[0].lineno, 3);
  assert.deepEqual(scrubbed.properties.$exception_list[0].mechanism, { handled: true, synthetic: false });
  assert.equal(scrubbed.timestamp, at);
  assert.equal(scrubbed.uuid, event.uuid);
  assert.deepEqual({ ...scrubbed.properties, $current_url: 0, $exception_list: 0 },
                   { ...event.properties, $current_url: 0, $exception_list: 0 });
});

// Last: the names that the page read stay hidden for the page's life, so for each test after this one too.
test("the players' names of a game that the page read go, with no quotes too, and as an address spells them", () => {
  const message = "cannot keep Ann Example's game against Bo Smith";
  assert.equal(scrubText(message), message);
  hidePlayers({ Blue: "Ann Example", Red: "?" });
  hidePlayers({ Blue: " B ", Red: "Bo Smith" });
  assert.equal(scrubText(message), "cannot keep …'s game against …");
  assert.equal(scrubText("GET https://partner.example/u/Ann%20Example?p=Bo+Smith: HTTP 500"),
               "GET https://partner.example/u/…?p=…: HTTP 500");
  // A name goes as a whole word only, and a name of one letter or the "?" of no name stays: they would remove letters.
  assert.equal(scrubText("Bo Smithers, B and ?"), "Bo Smithers, B and ?");
});
