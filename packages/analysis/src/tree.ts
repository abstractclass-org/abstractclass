// The review's game as a tree (design 07), as Lichess's analysis tree (ui/analyse): the game's own moves, and the
// branches a player adds. A place in the tree is a path: the moves from the start, as the record names them. A path
// that leaves the game's moves is a branch node. A node's children are the game's next move (when the node is on the
// game's line), then the branches from it, in the order they were added.

/** A path as one string, for maps and keys. The start is "". */
export const pathKey = (path: string[]) => path.join(" ");
/** The key of a path's parent, from the path's key: "" for a move from the start. */
export const parentKey = (key: string) => (key.includes(" ") ? key.slice(0, key.lastIndexOf(" ")) : "");
/** The last move of a path, from the path's key. */
export const lastMove = (key: string) => key.slice(key.lastIndexOf(" ") + 1);
/** The path key of each position along a line of moves: the start's (""), then each one's after a move. */
export function prefixKeys(names: string[]): string[] {
  const keys = [""];
  for (const name of names) keys.push(keys.length > 1 ? `${keys.at(-1)} ${name}` : name);
  return keys;
}

/** How many moves the path shares with the game's from the start. */
export function sharedLength(path: string[], main: string[]): number {
  let k = 0;
  while (k < path.length && k < main.length && path[k] === main[k]) k++;
  return k;
}

/** The path's place on the game's line (the number of moves played), or null when the path leaves the game. */
export function mainIndex(path: string[], main: string[]): number | null {
  return sharedLength(path, main) === path.length ? path.length : null;
}

/** The line that a branch's preview draws up to `path` (design 07, item 13): from the position where the path leaves
 *  the game's line, with the path's moves after it, each as the path to that move. A path on the game's line leaves it
 *  nowhere: its line is empty and starts at the path itself. The image of a line draws the same line. */
export function branchLine(path: string[], main: string[]): { start: string[]; paths: string[][] } {
  const k = sharedLength(path, main);
  return { start: path.slice(0, k), paths: path.slice(k).map((_, i) => path.slice(0, k + i + 1)) };
}

/** The branch nodes' children, by their parent's key, in the order the nodes were added. */
export function branchChildren(paths: string[][]): Map<string, string[][]> {
  const kids = new Map<string, string[][]>();
  for (const p of paths) {
    const parent = pathKey(p.slice(0, -1));
    kids.set(parent, [...(kids.get(parent) ?? []), p]);
  }
  return kids;
}

// A place's children, by its path.
type Children = (path: string[]) => string[][];

/** The children with a line merged in (the engine's best line, design 07): along the line, each of its paths is the
 *  first child of the path before it, whether the tree has it or not, and the tree's other children follow. So where a
 *  branch follows the line, the two are one row, and where they part, a fork. `line` is the line's paths in order. */
export function withLine(kidsOf: Children, line: string[][]): Children {
  const next = new Map(line.map(p => [pathKey(p.slice(0, -1)), p]));
  return path => {
    const n = next.get(pathKey(path));
    if (!n) return kidsOf(path);
    const key = pathKey(n);
    return [n, ...kidsOf(path).filter(k => pathKey(k) !== key)];
  };
}

/** A row of a branch in the move list: its moves (paths), and its indent (1 for a branch from the game). */
export interface BranchRow { depth: number; paths: string[][] }

/** A branch's rows in the move list, from its first move: the branch's moves on one row while each has one child.
 *  Where a node has more children, the row ends there, and every child's line follows, indented one step further, the
 *  first child's too (Lichess's way inside a variation, ui/analyse/src/treeView): the lines from a fork stand side by
 *  side. */
export function branchRows(first: string[], kidsOf: (path: string[]) => string[][], depth = 1): BranchRow[] {
  const rows: BranchRow[] = [];
  const row = [first];
  for (let kids = kidsOf(first); kids.length; kids = kidsOf(row.at(-1)!)) {
    if (kids.length > 1) {
      rows.push({ depth, paths: row });
      for (const k of kids) rows.push(...branchRows(k, kidsOf, depth + 1));
      return rows;
    }
    row.push(kids[0]);
  }
  rows.push({ depth, paths: row });
  return rows;
}

/** The tree's rules beside each row (Lichess's column view, ui/analyse/css/_tview.scss): `last`, the row is the last of
 *  its fork's lines at its depth, so its rule ends at its tick; `through`, the shallower depths whose rule passes this
 *  row on its way to a later line. Rows as branchRows gives them, the lines of one fork after one another. */
export function treeLines(rows: BranchRow[]): { last: boolean; through: number[] }[] {
  // Whether a later row has this depth before any row shallower than it.
  const laterAt = (k: number, depth: number) => {
    for (let j = k + 1; j < rows.length && rows[j].depth >= depth; j++) if (rows[j].depth === depth) return true;
    return false;
  };
  return rows.map((row, k) => ({
    last: !laterAt(k, row.depth),
    through: Array.from({ length: row.depth - 1 }, (_, d) => d + 1).filter(d => laterAt(k, d)),
  }));
}

// Moving between the lines at forks, as Lichess's keys do (ui/analyse/src/keyboard.ts). `childrenOf` gives a place's
// children, the game's move first.

/** Shift + ←: back to the nearest earlier place with more than one child, or the start. */
export function prevFork(path: string[], childrenOf: Children): string[] {
  for (let k = path.length - 1; k > 0; k--) if (childrenOf(path.slice(0, k)).length > 1) return path.slice(0, k);
  return [];
}

/** Shift + →: on along the first children to the next place with more than one child, or the line's end. */
export function nextFork(path: string[], childrenOf: Children): string[] {
  let p = path;
  for (let next = childrenOf(p)[0]; next; next = childrenOf(p)[0]) {
    p = next;
    if (childrenOf(p).length > 1) break;
  }
  return p;
}

/** Shift + ↑ and Shift + ↓: from the nearest fork above, the first move of the line before or after this one, round
 *  the fork's lines (Lichess's stepLine). Null when no fork is above. */
export function siblingLine(path: string[], childrenOf: Children, step: 1 | -1): string[] | null {
  for (let k = path.length - 1; k >= 0; k--) {
    const kids = childrenOf(path.slice(0, k));
    if (kids.length < 2) continue;
    const at = kids.findIndex(c => c[k] === path[k]);
    return kids[(at + step + kids.length) % kids.length];
  }
  return null;
}
