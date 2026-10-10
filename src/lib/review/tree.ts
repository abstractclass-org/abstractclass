// The review's game as a tree (design 07), as Lichess's analysis tree (ui/analyse): the game's own moves, and the
// branches a player adds. A place in the tree is a path: the moves from the start, as the record names them. A path
// that leaves the game's moves is a branch node. A node's children are the game's next move (when the node is on the
// game's line), then the branches from it, in the order they were added.

/** A path as one string, for maps and keys. The start is "". */
export const pathKey = (path: string[]) => path.join(" ");

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

/** The branch nodes' children, by their parent's key, in the order the nodes were added. */
export function branchChildren(paths: string[][]): Map<string, string[][]> {
  const kids = new Map<string, string[][]>();
  for (const p of paths) {
    const parent = pathKey(p.slice(0, -1));
    kids.set(parent, [...(kids.get(parent) ?? []), p]);
  }
  return kids;
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

// Moving between the lines at forks, as Lichess's keys do (ui/analyse/src/keyboard.ts). `childrenOf` gives a place's
// children, the game's move first.
type Children = (path: string[]) => string[][];

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
