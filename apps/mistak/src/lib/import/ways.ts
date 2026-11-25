// The ways in of a game that a player gives as text (docs/design/34-tak-site.md, item 10): a link to a playtak game, a
// ptn.ninja link, or PTN. A playtak game's number alone works too. All of them end in a record that the site takes
// (takeRecord), or in an Error whose message is a sentence for the player. A long ptn.ninja link holds its game in its
// path, so it needs no request. A short one holds an id (shortLink.ts).
import lz from "lz-string";
import { pastedError, RecordError as SharedRecordError, withTags } from "@abstractclass/record/record.ts";
import { takeRecord, type GameRecord } from "../game/record.ts";
import { GAME_ID, PLAYTAK_PATH } from "./playtakProxy.ts";
import { SHORT_ID, shortRecord } from "./shortLink.ts";

/** What a text is: a playtak game's number, a short link's id, or a record and whether it came in a link. */
export type Way = { way: "playtak" | "short"; id: string } | { way: "link" | "pasted"; record: string };

/** A game that came in: its record's text, and the record. */
export interface Brought { text: string; game: GameRecord }

const PLAYTAK = /^(?:https?:\/\/)?(?:www\.)?playtak\.com(?:[/?#]|$)/i;
/** A link to a game on playtak, in either of playtak's two viewers. */
const PLAYTAK_GAME = /^(?:https?:\/\/)?(?:www\.)?playtak\.com\/games\/(\d+)\/(?:playtakviewer|ninjaviewer)\/?(?:[?#]|$)/i;
const PTN_NINJA = /^(?:https?:\/\/)?(?:www\.)?ptn\.ninja(?:\/|$)/i;

/** The record that PTN Ninja's `text` stands for, as PTN Ninja reads it: packed by lz-string, or plain. */
function unpacked(text: string): string {
  if (!/^[A-Za-z0-9$+-]+$/.test(text)) return text;
  const record = lz.decompressFromEncodedURIComponent(text);
  if (!record) throw new Error("The site cannot read the game in this link.");
  return record;
}

/** What a ptn.ninja link is (the engine repository's games/tak/docs/research/ptn-ninja.md, 2.6): a short link's id, or the
 *  record in the path's part before the first `&`, packed or as plain text, as playtak's archive writes it. */
function readLink(link: string): Way {
  const path = link.replace(PTN_NINJA, "").split("&")[0];
  if (/^s(?:\/|$)/.test(path)) {
    const id = path.slice(2).split(/[?#]/)[0].replace(/\/$/, "");
    if (!SHORT_ID.test(id)) throw new Error("The site cannot read this short link of PTN Ninja.");
    return { way: "short", id };
  }
  if (!path) throw new Error("This link of PTN Ninja holds no game.");
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
  if (/^\d+$/.test(text)) return { way: "playtak", id: readNumber(text) };
  const game = PLAYTAK_GAME.exec(text);
  if (game) return { way: "playtak", id: readNumber(game[1]) };
  if (PLAYTAK.test(text))
    throw new Error("The site cannot read this link of playtak. The link of a game looks like this: https://playtak.com/games/(number)/playtakviewer.");
  if (PTN_NINJA.test(text)) return readLink(text);
  if (/^https?:\/\/\S+$/i.test(text)) throw new Error("The site reads links to games on playtak.com and links of ptn.ninja only.");
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
 *  playtak's PTN does not have: the link back to the game takes it from there. */
export async function playtakRecord(id: string, request: typeof fetch): Promise<string> {
  const paste = "Paste the PTN of the game, or try again later.";
  let response: Response;
  try {
    response = await request(PLAYTAK_PATH + id, { signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Error(`The site could not get the game from playtak. ${paste}`);
  }
  if (response.status === 404) throw new Error(`Playtak has no finished game with the number ${id}.`);
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

/** A playtak game by its number, `id`, as a text: an address can hold any. */
export async function bringPlaytak(id: string, request: typeof fetch): Promise<Brought> {
  const given = readNumber(id.trim());
  return bringRecord(await playtakRecord(given, request), false);
}

/** The game that the player gave. Throws an Error that says what is wrong, as a sentence for the player. */
export async function bringGame(given: string, request: typeof fetch): Promise<Brought> {
  const way = readWay(given);
  switch (way.way) {
    case "playtak": return bringPlaytak(way.id, request);
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
