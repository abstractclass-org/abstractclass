// The player's own moves on Blueprints' board (docs/design/33-drawing-board.md, "How the board takes a move"): what a
// click does, from the position's legal moves as strings. The site has no rules: the input never computes which moves
// are legal. It only matches what the player points at against the list.
// - A placement: a blueprint chosen in the mover's hand, then a marked anchor hex on the board. The hex clicked is the
//   anchor hex that the string names (`K@q,r`).
// - An edit: a cell chosen in a blueprint, then a marked new place in that blueprint or another one (`I:q,r>J:q,r`).
//   Both hexes are in the frames before the edit, as the hands show them.
// A click on a cell chooses both: its blueprint for a placement, and the cell for an edit. The next click tells them
// apart, on the board or in a hand, as on strategyjam.org. On a touch screen, which has no hover, the first tap on a
// marked hex shows the move (a placement's footprint, an edit's cell in its new place), and a second tap on it makes
// it. A tap on the board snaps to the nearest marked anchor hex, as on strategyjam.org (tapHex). Pure functions, for
// the board's input (blueprintInput.svelte.ts) and its tests.
import { parseMove, type HandCell, type Move } from "../game/notation.ts";
import { center, hexKey, sameHex, type Hex } from "./hex.ts";
import { PLAYER_NAMES, sameHandHex, type BlueprintNumber, type HandHex, type Player, type SitePosition } from "./position.ts";

/** The position's rules for the player's own moves: the position, its mover, and every legal move as a string (the
 *  engine's describe, request 23). */
export interface InputRules { position: SitePosition; mover: Player; legal: readonly string[] }

/** The legal moves, as the board marks them: each blueprint's anchor hexes, and each cell's new places, by the cell's
 *  name in an edit (`I:q,r`, cellKey). */
export interface Legal { placements: Map<BlueprintNumber, Hex[]>; edits: Map<string, HandHex[]> }

/** A hex of a blueprint's frame, as an edit names it: `I:q,r`. */
export const cellKey = (blueprint: BlueprintNumber, hex: Hex) => `${blueprint}:${hexKey(hex)}`;
/** A hex of a blueprint's frame as the board draws it, from the notation's form, and back. */
export const handHexOf = ({ blueprint, q, r }: HandCell): HandHex => ({ blueprint, hex: [q, r] });
export const cellOf = ({ blueprint, hex: [q, r] }: HandHex): HandCell => ({ blueprint, q, r });

export function legalOf(rules: InputRules): Legal {
  const placements = new Map<BlueprintNumber, Hex[]>(), edits = new Map<string, HandHex[]>();
  const add = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
    const list = map.get(key);
    if (list) list.push(value); else map.set(key, [value]);
  };
  for (const name of rules.legal) {
    if (name === "pass") continue;
    const m = parseMove(name);
    if (m.kind === "place") add(placements, m.blueprint, [m.q, m.r] as const);
    else add(edits, cellKey(m.from.blueprint, [m.from.q, m.from.r]), handHexOf(m.to));
  }
  return { placements, edits };
}

/** On a touch screen, the move that the first tap shows. */
export type Shown = { type: "place"; at: Hex } | { type: "edit"; to: HandHex };
/** The move begun: the blueprint chosen for a placement, the cell of it chosen for an edit, and the move shown. */
export interface Begun { blueprint: BlueprintNumber; cell: Hex | null; shown: Shown | null }
/** Why the last click did nothing: a click on the board with nothing begun ("nothing"), a click in the opponent's
 *  hand ("opponent"), a hex of the board that is not a marked anchor hex ("anchor"), or, while a cell is chosen, a hex
 *  of a blueprint that is not a cell and not a marked new place ("target"). */
export type Refusal = "nothing" | "opponent" | "anchor" | "target";
export interface InputState { begun: Begun | null; refused: Refusal | null }
/** Nothing begun: the state at the start, after a move, and after Escape. */
export const IDLE: InputState = { begun: null, refused: null };
/** A click's result: the input's next state, and the move made, if any. */
export interface Click { state: InputState; move: Move | null }

const begin = (begun: Begun): Click => ({ state: { begun, refused: null }, move: null });
const refuse = (begun: Begun | null, refused: Refusal): Click => ({ state: { begun, refused }, move: null });
const made = (move: Move): Click => ({ state: IDLE, move });

/** The marked anchor hexes: the chosen blueprint's legal placements. Null: no blueprint chosen. */
export const anchorsOf = (begun: Begun | null, legal: Legal): Hex[] | null =>
  begun ? legal.placements.get(begun.blueprint) ?? [] : null;
/** The marked new places of the chosen cell. Null: no cell chosen. */
export const targetsOf = (begun: Begun | null, legal: Legal): HandHex[] | null =>
  begun?.cell ? legal.edits.get(cellKey(begun.blueprint, begun.cell)) ?? [] : null;

/** strategyjam.org's reach of a tap on the board, in units (a hex's radius): a tap snaps to the nearest marked anchor
 *  hex whose centre is this near. */
const TAP_REACH = 2;

/** The hex that a tap on the board's point (x, y) means, on the hex `hex`: the shown placement's anchor hex when the tap
 *  is on its footprint (`shown`: that anchor hex and the footprint's hexes), or else the nearest marked anchor hex
 *  within TAP_REACH, or else the hex itself. The board's hexes are small on a phone, so a tap need not hit the hex
 *  exactly. */
export function tapHex(hex: Hex, [x, y]: readonly [number, number], shown: { at: Hex; hexes: readonly Hex[] } | null,
                       anchors: readonly Hex[]): Hex {
  if (shown?.hexes.some(h => sameHex(h, hex))) return shown.at;
  let best: Hex | null = null, bestD: number = TAP_REACH;
  for (const a of anchors) {
    const [ax, ay] = center(a), d = Math.hypot(ax - x, ay - y);
    if (d < bestD) [best, bestD] = [a, d];
  }
  return best ?? hex;
}

/** A click on a hex of the board, with the move begun: a marked anchor hex places the chosen blueprint. */
export function clickBoard(begun: Begun | null, legal: Legal, hex: Hex, touch: boolean): Click {
  if (!begun) return refuse(null, "nothing");
  if (!anchorsOf(begun, legal)!.some(a => sameHex(a, hex))) return refuse({ ...begun, shown: null }, "anchor");
  if (touch && !(begun.shown?.type === "place" && sameHex(begun.shown.at, hex)))
    return begin({ ...begun, shown: { type: "place", at: hex } });
  return made({ kind: "place", blueprint: begun.blueprint, q: hex[0], r: hex[1] });
}

/** A click on a hex of a blueprint's frame in a player's hand, with the move begun:
 *  - a marked new place of the chosen cell makes the edit,
 *  - a cell chooses its blueprint and itself, and the chosen cell again cancels the move begun,
 *  - another hex of the blueprint's panel is a new place that is not legal while a cell is chosen, and else chooses
 *    the blueprint alone. */
export function clickHand(begun: Begun | null, rules: InputRules, legal: Legal, player: Player, at: HandHex,
                          touch: boolean): Click {
  if (player !== rules.mover) return refuse(begun, "opponent");
  if (begun?.cell && targetsOf(begun, legal)!.some(t => sameHandHex(t, at))) {
    if (touch && !(begun.shown?.type === "edit" && sameHandHex(begun.shown.to, at)))
      return begin({ ...begun, shown: { type: "edit", to: at } });
    return made({ kind: "edit", from: cellOf({ blueprint: begun.blueprint, hex: begun.cell }), to: cellOf(at) });
  }
  if (rules.position.blueprints[player][at.blueprint - 1][hexKey(at.hex)]) {
    if (begun?.cell && begun.blueprint === at.blueprint && sameHex(begun.cell, at.hex)) return { state: IDLE, move: null };
    return begin({ blueprint: at.blueprint, cell: at.hex, shown: null });
  }
  if (begun?.cell) return refuse({ ...begun, shown: null }, "target");
  return begin({ blueprint: at.blueprint, cell: null, shown: null });
}

/** What the input shows of itself, for its status: also its rules, and whether the player uses touch, so that the
 *  texts say "tap". */
export interface InputView {
  readonly rules: InputRules | null;
  readonly pending: Begun | null;
  readonly refused: Refusal | null;
  readonly anchors: readonly Hex[] | null;
  readonly targets: readonly HandHex[] | null;
  readonly touch: boolean;
}

/** The text that asks for the first click, with its verb ("Click", "tap"). */
const chooseText = (verb: string, mover: Player) => `${verb} a blueprint or a cell in ${PLAYER_NAMES[mover]}'s hand.`;

/** The status line while the input is on and nothing is begun: what to do first. inputStatus is null then, as the
 *  view's game interface asks, so that a page chooses where this text goes. The review's status line shows the
 *  position there. Strict Simplified Technical English, and "Tap" on a touch screen. */
export const firstStatus = (input: Pick<InputView, "touch">, mover: Player): string =>
  chooseText(input.touch ? "Tap" : "Click", mover);

/** The status line: what the move begun needs next, or why a click did nothing. Null when nothing is begun. It says
 *  that a move is not legal only after the player tries that move: a click on the board for a placement, a click in
 *  a blueprint for an edit. Strict Simplified Technical English, with the glossary's words (CLAUDE.md, "Writing the
 *  site's text"), and "tap" on a touch screen. Each text fits in two lines of a phone's status line. */
export function inputStatus(input: InputView, mover: Player): string | null {
  const { pending: begun, refused } = input;
  const verb = input.touch ? "tap" : "click", Verb = input.touch ? "Tap" : "Click";
  if (refused === "nothing") return `First, ${chooseText(verb, mover)}`;
  if (refused === "opponent") return `${PLAYER_NAMES[mover]} moves now. ${chooseText(Verb, mover)}`;
  if (!begun) return null;
  const k = begun.blueprint;
  if (begun.shown) return begun.shown.type === "place" ? `To place blueprint ${k} here, tap the footprint again.`
    : "To move the cell here, tap the same hex again.";
  // A blueprint with no cells: only an edit can put a cell in it.
  if (!Object.keys(input.rules?.position.blueprints[mover][k - 1] ?? {}).length)
    return `Blueprint ${k} has no cells. To put a cell in it, first ${verb} a cell in a different blueprint.`;
  const anchors = input.anchors?.length ?? 0, targets = input.targets?.length ?? 0, cell = !!begun.cell;
  const place = `To place blueprint ${k}, ${verb} a marked anchor hex.`;
  const edit = `To move the cell, ${verb} a marked hex in a blueprint.`;
  const noPlace = `Blueprint ${k} has no legal placement.`, noEdit = "This cell has no legal edit.";
  // What the move begun needs next: a blueprint alone is placed, and a cell's blueprint is placed or the cell moved.
  const next = [anchors ? place : "", cell && targets ? edit : ""].filter(Boolean).join(" ");
  const retry = `${Verb} a different ${cell ? "cell" : "blueprint"}.`;
  // The player tried a placement or an edit that is not legal: why, then what the move begun can do.
  if (refused === "anchor")
    return anchors ? `Blueprint ${k} cannot have its anchor cell on this hex. ${Verb} a marked anchor hex.` : `${noPlace} ${next || retry}`;
  if (refused === "target")
    return targets ? `The cell cannot move to this hex. ${Verb} a marked hex in a blueprint.` : `${noEdit} ${next || retry}`;
  return next || [noPlace, cell ? noEdit : "", retry].filter(Boolean).join(" ");
}

/** The clicks on the board, for the list of keys and clicks. */
export const INPUT_CLICKS: [string, string][] = [
  ["Click a blueprint in the hand, then a marked anchor hex", "Place the blueprint"],
  ["Click a cell of a blueprint, then a marked hex in a blueprint", "Move the cell: an edit"],
  ["On a touch screen, tap a marked hex two times", "Make the move. The first tap shows it"],
];
