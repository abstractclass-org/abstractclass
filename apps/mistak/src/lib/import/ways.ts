// The ways in of a game that a player gives as text (docs/design/34-tak-site.md, item 10): the number of a playtak game,
// a ptn.ninja link, or PTN. All of them end in a record that the site takes (takeRecord), or in an Error whose message
// is a sentence for the player. A ptn.ninja link holds its game in its path, so it needs no request.
import lz from "lz-string";
import { pastedError, RecordError as SharedRecordError, withTags } from "@abstractclass/record/record.ts";
import { takeRecord, type GameRecord } from "../game/record.ts";
import { GAME_ID, PLAYTAK_PATH } from "./playtakProxy.ts";

/** What a text is: a playtak game's number, or a record and whether it came in a link. */
export type Way = { way: "playtak"; id: string } | { way: "link" | "pasted"; record: string };

/** A game that came in: its record's text, and the record. */
export interface Brought { text: string; game: GameRecord }

const PTN_NINJA = /^(?:https?:\/\/)?(?:www\.)?ptn\.ninja(?:\/|$)/i;

/** The record in a ptn.ninja link's path (the engine repository's games/tak/docs/research/ptn-ninja.md, 2.6): the part
 *  before the first `&`, packed by lz-string, or plain text, as playtak's archive writes it. */
function linkRecord(link: string): string {
  const path = link.replace(PTN_NINJA, "").split("&")[0];
  if (/^s\//.test(path)) throw new Error("This is a short link of PTN Ninja, which does not hold the game. Open it, and copy the long link or the PTN.");
  if (!path) throw new Error("This link of PTN Ninja holds no game.");
  const packed = path.split(/[?#]/)[0];
  if (/^[A-Za-z0-9$+-]+$/.test(packed)) {
    const record = lz.decompressFromEncodedURIComponent(packed);
    if (!record) throw new Error("The site cannot read the game in this link.");
    return record;
  }
  try {
    return decodeURIComponent(path);
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
  if (PTN_NINJA.test(text)) return { way: "link", record: linkRecord(text) };
  if (/^https?:\/\/\S+$/i.test(text)) throw new Error("The site reads links of PTN Ninja only. For a playtak game, type the number of the game.");
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
  return way.way === "playtak" ? bringPlaytak(way.id, request) : bringRecord(way.record, way.way === "pasted");
}

/** The game's page on playtak, by the `PlayTakID` tag: the page opens the game on playtak's board. Null without a tag
 *  that is a game's number. */
export function playtakPage(tags: Record<string, string>): string | null {
  const id = tags.PlayTakID?.trim() ?? "";
  return GAME_ID.test(id) ? `https://playtak.com/games/${id}/playtakviewer` : null;
}

/** The record in PTN Ninja, packed in the link's path. */
export const ptnNinjaLink = (text: string): string => `https://ptn.ninja/${lz.compressToEncodedURIComponent(text)}`;
