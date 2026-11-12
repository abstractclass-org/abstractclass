// A reviewed game, or an Analysis board's lines, as an annotated record (Hedge School's designs 13 and 21), as Lichess
// exports a game it analysed: the record's tags and turns, the engine's view after each move as `[%eval W L S]`, each
// Inaccuracy, Mistake, Blunder and Great as a comment ("Mistake. D10-G9 G9-H10 was best.", Lichess's words), "A hard
// position." where the review marks one, the record's clocks, and the player's own lines as variations. By turn, each
// turn's label is also a quality mark after its last move: `!` Great, `?!` Inaccuracy, `?` Mistake, `??` Blunder
// (Best, Excellent and Good have none, as in PGN and Lichess). By move, the labels stay in comments: the notation's
// marks judge turns. The record's frame is the shared one (@abstractclass/record/record.ts). Each game writes the moves
// played (`played`): Hedge School's edges with their cut marks, Cyanotype's placements with their capture marks. The
// engine's choice in a comment is the move's name (Game.moveName).
//
// Where a variation goes, as the notation decides: after the turn it changes, after that turn's last move, its mark and
// its comments. `N.` starts at the turn's start and replaces the whole turn: `3. D10-G9 G9-H10 (3. D10-F13 F13-G10)`.
// `N...` starts at the turn's second move and shares its first: `4. N9-Q10 L10-N9 (4... M12-N9)`. Several variations of
// a turn follow it one after another: those from its start first, then those from its second move, each in the order
// the player made them.
import { BAD_LABELS, type Label } from "./labels.ts";
import { LABEL_TEXT, type Analysis, type Review, type Unit } from "./model.ts";
import type { Game, GameTypes, Player } from "./game.ts";
import { mainIndex, pathKey as key } from "./tree.ts";
import { writeTags } from "@abstractclass/record/record.ts";

export interface AnnotateInput<G extends GameTypes> {
  R: Review<G>;
  unit: Unit; // which labels: by turn or by move, as the review shows them
  tags: Record<string, string>;
  result: string | null;
  clocks?: (string | null)[]; // the record's, by move
  branches?: Record<string, { move: G["played"]; analysis?: Analysis<G["move"]>; order: number }>; // the player's own, by path key
  note?: string; // a comment before the first turn
  annotator?: string; // the `Annotator` tag (PGN's): who annotated the game
}

/** The labels that a comment names: Great, and the bad ones. Best, Excellent and Good stay unsaid. */
const COMMENTED = new Set<Label>(["great", ...BAD_LABELS]);
/** A turn's quality mark (the notation's, PGN's suffixes): Great `!`, Inaccuracy `?!`, Mistake `?`, Blunder `??`. */
const QUALITY_MARK: Partial<Record<Label, string>> = { great: "!", inaccuracy: "?!", mistake: "?", blunder: "??" };

/** The engine's view after a move, Blue's: `[%eval W L S]`, the lead with its sign. */
export function evalCommand(a: Analysis<unknown> | undefined): string {
  if (!a) return "";
  const lead = a.lead !== undefined ? `${a.lead >= 0 ? "+" : "-"}${Math.abs(a.lead).toFixed(1)}` : "";
  return a.lead !== undefined && a.spread !== undefined ? `[%eval ${a.blueWin.toFixed(3)} ${lead} ${a.spread.toFixed(1)}]` : "";
}

interface Node { path: string[]; text: string; player: Player; comment: string; mark?: string }

/** The annotated record of `input`'s review, each move played written by `played`: its name, then the game's mark
 *  (Enclosure's cut, Blueprints' capture). */
export function annotatedRecord<G extends GameTypes>(game: Game<G>, played: (move: G["played"]) => string,
                                                    { R, unit, tags, result, clocks = [], branches = {}, note, annotator }: AnnotateInput<G>): string {
  const n = R.edges.length;
  const name = (m: G["move"]) => game.moveName(m);
  const mainNames = R.edges.map(e => name(e.edge));

  // The game's line, with its labels and evaluations.
  const main: Node[] = R.edges.map((e, i) => {
    const parts: string[] = [];
    let label: Label | null = null, best: string | undefined, hard = false, mark: string | undefined;
    if (unit === "edge") {
      label = e.label;
      best = e.best ? name(e.best.edge) : undefined;
      hard = e.hard;
    } else {
      const t = R.turnOf[i];
      if (t && t.end - 1 === i) { label = t.label; best = t.best?.map(name).join(" "); hard = t.hard; mark = label ? QUALITY_MARK[label] : undefined; }
    }
    if (label && COMMENTED.has(label)) parts.push(`${LABEL_TEXT[label]}.`);
    if (label && BAD_LABELS.includes(label) && best) parts.push(`${best} was best.`);
    if (hard) parts.push("A hard position.");
    if (clocks[i]) parts.push(`[%clk ${clocks[i]}]`);
    if (i + 1 < n || !R.endedByRules) parts.push(evalCommand(R.data.analysis[i + 1])); // not at a game's end
    return { path: mainNames.slice(0, i + 1), text: played(R.data.moves[i]), player: e.player, comment: parts.filter(Boolean).join(" "), mark };
  });

  // The player's lines: each node under its parent's key, in the order the player added them.
  const byParent = new Map<string, Node[]>();
  for (const [k, b] of Object.entries(branches).sort((a, b) => a[1].order - b[1].order)) {
    const path = k.split(" ");
    const node: Node = { path, text: played(b.move), player: b.move.player, comment: evalCommand(b.analysis) };
    const parent = key(path.slice(0, -1));
    byParent.set(parent, [...(byParent.get(parent) ?? []), node]);
  }
  const nodeAt = new Map<string, Node>([...main.map((m): [string, Node] => [key(m.path), m]),
                                         ...[...byParent.values()].flat().map((b): [string, Node] => [key(b.path), b])]);
  const children = (path: string[]): Node[] => {
    const first = mainIndex(path, mainNames) !== null && path.length < n ? main[path.length] : undefined;
    const others = (byParent.get(key(path)) ?? []).filter(b => !first || b.path.at(-1) !== first.path.at(-1));
    return first ? [first, ...others] : others;
  };
  // A turn starts where the mover changes. Its number counts the turns before it on its own line, from the start's turn:
  // a line from a set-up position (Hedge School's design 21) numbers from its turn, and its first move can be a turn's
  // second.
  const from = game.turn(R.data.positions[0]?.count ?? 0);
  const turnNo = new Map<string, number>();
  const startsTurn = (node: Node) => node.path.length === 1 ? from.first : nodeAt.get(key(node.path.slice(0, -1)))?.player !== node.player;
  const numberOf = (node: Node): number => {
    const k = key(node.path);
    if (!turnNo.has(k)) {
      const parent = nodeAt.get(key(node.path.slice(0, -1)));
      turnNo.set(k, (parent ? numberOf(parent) : from.turn - (from.first ? 1 : 0)) + (startsTurn(node) ? 1 : 0));
    }
    return turnNo.get(k)!;
  };

  /** A line from `start` on: its moves, and the variations off it where the notation puts them. `alternatives` are the
   *  variations in place of `start`'s turn, when it starts one. */
  function walk(start: Node, alternatives: string[] = []): string[] {
    const out: string[] = [];
    // The variations of the turn being written, which wait until it ends: those from its start, then those from its
    // second move. The variations in place of the next turn wait for that turn.
    let node: Node | undefined = start, first = true, waiting = alternatives;
    while (node) {
      if (startsTurn(node)) out.push(`${numberOf(node)}.`);
      else if (first) out.push(`${numberOf(node)}...`);
      const [next, ...others] = children(node.path);
      const texts = others.map(b => `(${walk(b).join(" ")})`);
      const endsTurn = !next || startsTurn(next);
      out.push(endsTurn && node.mark ? `${node.text}${node.mark}` : node.text);
      if (node.comment) out.push(`{ ${node.comment} }`);
      if (endsTurn) { out.push(...waiting); waiting = texts; } // this turn's variations, then the next turn's wait
      else waiting = [...waiting, ...texts]; // variations from this turn's second move
      first = false;
      node = next;
    }
    return [...out, ...waiting];
  }

  const [first, ...others] = children([]);
  const body = [
    ...(note ? [`{ ${note} }`] : []),
    ...(first ? walk(first, others.map(b => `(${walk(b).join(" ")})`)) : []),
    result ?? "*",
  ];
  return `${writeTags({ ...tags, ...(annotator ? { Annotator: annotator } : {}), Result: result ?? "*" })}\n\n${wrap(body.join(" "))}\n`;
}

/** Lines of at most 80 characters, as PGN's export format asks, broken at spaces but never inside a command
 *  (`[%eval 0.512 +3.0 120.0]`), which other readers may want on one line. */
function wrap(text: string, width = 80): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.match(/\[%[^\]]*\]|\S+/g) ?? []) {
    if (line && line.length + 1 + word.length > width) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}
