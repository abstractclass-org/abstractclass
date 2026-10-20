// The documents wrap at 120 characters (docs/working-notes.md). This check refuses an added line over 120 in the
// repository's Markdown files between two commits. The Documents workflow (.github/workflows/docs.yml) runs it on the
// pushed range, and the hook .githooks/pre-commit on the commit that the index holds, before Git makes it.
//   node scripts/doc-widths.mjs <from> [<to>]     (<to>: HEAD by default)
//   node scripts/doc-widths.mjs --staged          (the index against HEAD; it prints nothing when it passes)
// A line may be longer where it cannot wrap: a table row, a line in a code block, or a line whose length comes from
// URLs (a link's target, `<https://…>`, a bare URL). The text around a URL still counts. A moved file's lines are not
// added. Code keeps its own lengths.
// Tests: node --test "scripts/*.test.mjs"
import { execFileSync } from "node:child_process";

export const WIDTH = 120;

/** The line's length in characters (code points), as an editor counts them. */
export const chars = s => [...s].length;

const withoutUrls = line =>
  line.replace(/\]\([^)\s]*\)/g, "]()").replace(/<https?:\/\/[^>\s]*>/g, "<>").replace(/https?:\/\/\S*/g, "");

/** The added lines (numbers from 1) of a Markdown text that are over the width and can wrap. */
export function overlong(text, added) {
  const found = [];
  let fence = null;
  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/\r$/, "");
    const mark = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && !line.trim().slice(mark.length)) fence = null;
      return;
    }
    if (mark) {
      fence = mark;
      return;
    }
    if (!added.has(i + 1) || line.trimStart().startsWith("|") || chars(withoutUrls(line)) <= WIDTH) return;
    found.push({ line: i + 1, chars: chars(line) });
  });
  return found;
}

/** Each file's added lines (numbers from 1), from `git diff --unified=0 --no-prefix`. A `+++` line names the file
 *  only in the header between `diff --git` and the first hunk: in a hunk, it is an added line that starts with `++`.
 *  Git ends a path that has a space with a tab. */
export function addedLines(diff) {
  const files = new Map();
  let lines = null;
  let header = false;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      header = true;
      lines = null;
      continue;
    }
    if (header && line.startsWith("+++ ")) {
      const path = line.slice(4).replace(/\t$/, "");
      lines = path === "/dev/null" ? null : new Set();
      if (lines) files.set(path, lines);
      continue;
    }
    const hunk = line.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
    if (hunk) header = false;
    if (hunk && lines) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let n = start; n < start + count; n++) lines.add(n);
    }
  }
  return files;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const staged = args[0] === "--staged";
  const [from, to = "HEAD"] = staged ? [] : args;
  if (!staged && !from) {
    console.error("usage: node scripts/doc-widths.mjs <from> [<to>] | --staged");
    process.exit(2);
  }
  const git = (...args) =>
    execFileSync("git", ["-c", "core.quotePath=false", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
  // The index's files: `git show :<path>`. A commit with -a has its own index, which GIT_INDEX_FILE names for git.
  const diff = git("diff", "--unified=0", "--no-prefix", "--no-color", "--no-ext-diff", "--no-textconv",
    "--find-renames", ...(staged ? ["--cached"] : [from, to]), "--", "*.md");
  const files = addedLines(diff);
  let count = 0;
  let refused = 0;
  for (const [path, added] of files) {
    count += added.size;
    for (const { line, chars: n } of overlong(git("show", staged ? `:${path}` : `${to}:${path}`), added)) {
      console.log(`${path}:${line}: ${n} characters (at most ${WIDTH})`);
      refused++;
    }
  }
  const range = staged ? "the staged changes" : `${from}..${to}`;
  if (refused) {
    console.log(`doc-widths: FAIL ${refused} added lines over ${WIDTH} characters in ${range}`);
    if (staged) console.log(`doc-widths: no commit. Wrap the lines at ${WIDTH} characters, stage them, then commit again.`);
  } else if (!staged) console.log(`doc-widths: PASS ${count} added lines in ${files.size} Markdown files in ${range}`);
  process.exit(refused ? 1 : 0);
}
