// The ways in of a game that a player gives as text (docs/design/34-tak-site.md, item 10): a link to a playtak game, a
// PTN Ninja link, or PTN. A playtak game's number alone works too. All of them end in a record that the site takes
// (takeRecord), or in an Error whose message is a sentence for the player. A long PTN Ninja link holds its game in its
// path, and a playtak link with `?load=` in its query, so they need no request. A short PTN Ninja link holds an id
// (shortLink.ts).
import lz from "lz-string";
import { pastedError, RecordError as SharedRecordError, withTags } from "@abstractclass/record/record.ts";
import { takeRecord, type GameRecord } from "../game/record.ts";
import { GAME_ID, PLAYTAK_PATH } from "./playtakProxy.ts";
import { SHORT_ID, shortRecord } from "./shortLink.ts";

/** What a text is: a playtak game's number, `linked` if it came in a link, a short link's id, or a record and whether it
 *  came in a link. */
export type Way = { way: "playtak"; id: string; linked: boolean } | { way: "short"; id: string }
  | { way: "link" | "pasted"; record: string };

/** A game that came in: its record's text, and the record. */
export interface Brought { text: string; game: GameRecord }

const PLAYTAK = /^(?:https?:\/\/)?(?:www\.)?playtak\.com(?:[/?#]|$)/i;
/** A link to a game on playtak: an address under its number, such as the one of a viewer. Only the number counts. */
const PLAYTAK_GAME = /^(?:https?:\/\/)?(?:www\.)?playtak\.com\/games\/(\d+)(?:[/?#]|$)/i;
/** A link to playtak's board with a game in it, as the board's page writes and reads it (`copyNotationLink` in its
 *  js/main.js, and js/board.js): the text after `?load=` at the query's start, up to another `?load=`. An `&` ends
 *  nothing, and a `+` is a move's. The letters of `load` are small. */
const PLAYTAK_LOAD = /^(?:https?:\/\/)?(?:www\.)?playtak\.com\/?(\?[^#]*)/i;
const PTN_NINJA = /^(?:https?:\/\/)?(?:www\.)?ptn\.ninja(?:\/|$)/i;

/** The record that PTN Ninja's `text` stands for, as PTN Ninja reads it: packed by lz-string, or plain. */
function unpacked(text: string): string {
  if (!/^[A-Za-z0-9$+-]+$/.test(text)) return text;
  const record = lz.decompressFromEncodedURIComponent(text);
  if (!record) throw new Error("The site cannot read the game in this link.");
  return record;
}

/** The record in a playtak link with `?load=`, from the link's query after it. */
function readLoad(query: string): Way {
  let record: string;
  try {
    record = decodeURIComponent(query.split("?load=")[0]);
  } catch {
    throw new Error("The site cannot read the game in this link.");
  }
  if (!record.trim()) throw new Error("This playtak link holds no game.");
  return { way: "link", record };
}

/** What a PTN Ninja link is (the engine repository's games/tak/docs/research/ptn-ninja.md, 2.6): a short link's id, or the
 *  record in the path's part before the first `&`, packed or as plain text, as playtak's archive writes it. */
function readLink(link: string): Way {
  const path = link.replace(PTN_NINJA, "").split("&")[0];
  if (/^s(?:\/|$)/.test(path)) {
    const id = path.slice(2).split(/[?#]/)[0].replace(/\/$/, "");
    if (!SHORT_ID.test(id)) throw new Error("The site cannot read this short PTN Ninja link.");
    return { way: "short", id };
  }
  if (!path) throw new Error("This PTN Ninja link holds no game.");
  const packed = path.split(/[?#]/)[0];
  const record = unpacked(packed);
  if (record !== packed) return { way: "link", record };
  try {
    return { way: "link", record: decodeURIComponent(path) };
  } catch {
    throw new Error("The site cannot read the game in this link.");
  }
}

/** A playtak game's number. Throws an Error for a text that is none. */
function readNumber(text: string): string {
  if (GAME_ID.test(text)) return text;
  throw new Error("The number of a playtak game has 1 to 10 digits, and does not start with 0.");
}

/** What the player gave. Throws an Error for a link that is not read, or a number that is not a game's. */
export function readWay(given: string): Way {
  const text = given.trim();
  if (/^\d+$/.test(text)) return { way: "playtak", id: readNumber(text), linked: false };
  const id = PLAYTAK_GAME.exec(text)?.[1];
  if (id && GAME_ID.test(id)) return { way: "playtak", id, linked: true };
  const query = PLAYTAK_LOAD.exec(text)?.[1];
  if (query?.startsWith("?load=")) return readLoad(query.slice("?load=".length));
  if (PLAYTAK.test(text))
    throw new Error("The site cannot read this playtak link. The link of a game looks like this: https://playtak.com/games/(number)/playtakviewer.");
  if (PTN_NINJA.test(text)) return readLink(text);
  if (/^https?:\/\/\S+$/i.test(text)) throw new Error("The site reads links to games on playtak.com and PTN Ninja links only.");
  return { way: "pasted", record: text };
}

/** A message as a sentence: the reader's messages start in lower case. */
const sentence = (message: string) => message.charAt(0).toUpperCase() + message.slice(1).replace(/\.?$/, ".");

/** Reads a record that came in. The Error of a record whose text the player sees (`pasted`) says where its problem is. */
export function bringRecord(text: string, pasted: boolean): Brought {
  try {
    return { text, game: takeRecord(text) };
  } catch (e) {
    if (!(e instanceof SharedRecordError)) throw e;
    throw new Error(sentence(pasted ? pastedError(e, text, text).message : e.message));
  }
}

/** A playtak game's PTN by its number, from the site's Function, with the game's number in its `PlayTakID` tag, which
 *  playtak's PTN does not have: the link back to the game takes it from there. The Error of a game that playtak does not
 *  have names the number only to a player who gave it, and the link to one who gave that (`linked`). */
export async function playtakRecord(id: string, request: typeof fetch, linked: boolean): Promise<string> {
  const paste = "Paste the PTN of the game, or try again later.";
  let response: Response;
  try {
    response = await request(PLAYTAK_PATH + id, { signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Error(`The site could not get the game from playtak. ${paste}`);
  }
  if (response.status === 404) throw new Error(`Playtak has no finished game ${linked ? "at this link" : `with the number ${id}`}.`);
  // Another address than the Function's answers with a page (a development server's, a copy of the site elsewhere).
  if (!response.ok || !/^text\/plain\b/i.test(response.headers.get("Content-Type") ?? ""))
    throw new Error(`The site could not get the game from playtak. ${paste}`);
  let record: string;
  try {
    record = await response.text();
  } catch {
    throw new Error(`The site could not get the game from playtak. ${paste}`);
  }
  return /^\s*\[\s*PlayTakID\s/im.test(record) ? record : withTags(record, { PlayTakID: id });
}

/** A playtak game by its number, `id`, as a text: an address can hold any. The number came in a link, if not said. */
export async function bringPlaytak(id: string, request: typeof fetch, linked = true): Promise<Brought> {
  const given = readNumber(id.trim());
  return bringRecord(await playtakRecord(given, request, linked), false);
}

/** The game that the player gave. Throws an Error that says what is wrong, as a sentence for the player. */
export async function bringGame(given: string, request: typeof fetch): Promise<Brought> {
  const way = readWay(given);
  switch (way.way) {
    case "playtak": return bringPlaytak(way.id, request, way.linked);
    case "short": return bringRecord(unpacked(await shortRecord(way.id, request)), false);
    default: return bringRecord(way.record, way.way === "pasted");
  }
}

/** The game's page on playtak, by the `PlayTakID` tag: the page opens the game on playtak's board. Null without a tag
 *  that is a game's number. */
export function playtakPage(tags: Record<string, string>): string | null {
  const id = tags.PlayTakID?.trim() ?? "";
  return GAME_ID.test(id) ? `https://playtak.com/games/${id}/playtakviewer` : null;
}

/** The record in PTN Ninja, packed in the link's path. */
export const ptnNinjaLink = (text: string): string => `https://ptn.ninja/${lz.compressToEncodedURIComponent(text)}`;
