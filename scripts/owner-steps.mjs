// Each block of the owner's steps is self-contained: a step names its own URL, clicks and values, and does not send
// the reader to another section, another design or another site's setup for what to do. This check reads every
// Markdown file under docs/ and each app's and package's README (apps/*/README.md, packages/*/README.md).
//
// A block starts at a line that holds `**The owner's steps`, or at a heading that holds "owner's steps" (any case). A
// heading's block runs to the next heading of the same or a higher level. A bold line's block runs to the next
// heading of any level. In a block, the check refuses each phrase of PATTERNS: each sends the reader elsewhere for
// what to do. A link to a page for the reader's information stays allowed: the check reads a link's text, not its
// target. A fenced code block does not count. A phrase may wrap from one line to the next.
//
// The decision logs (docs/decisions/) are history, and the check reads them too: an entry that it refuses keeps its
// words, and its log goes out of the check, with the reason, in place of a rewrite.
//
//   node scripts/owner-steps.mjs [ROOT]
//
// It prints each refusal with its file, its line and the phrase, and exits 1 when there is one. ROOT is the
// repository's root (the default: this script's). npm run check:all runs it (scripts/check-all.mjs).
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** A word that does not end a sentence or a clause: the words of one phrase stay in one sentence. */
const WORD = String.raw`[^\s]*[^\s.:;!?]`;

/** The phrases that send the reader elsewhere for what to do. Each is short and exact: a wider one refuses steps that
 *  are complete. */
export const PATTERNS = [
  { name: "steps of section", pattern: /\bsteps\s+of\s+section\b/gi },
  { name: "as section N", pattern: /\bas\s+section\s+\d+/gi },
  { name: "as … does", pattern: new RegExp(String.raw`\bas\s+(?:${WORD}\s+){1,6}?does\b`, "gi") },
  {
    name: "as …'s … has",
    pattern: new RegExp(String.raw`\bas\s+(?:${WORD}\s+){0,4}?[^\s]*['’]s\s+(?:${WORD}\s+){0,4}?has\b`, "gi"),
  },
  { name: "as design NN lists", pattern: /\bas\s+design\s+\d+\s+lists\b/gi },
  { name: "repeat the", pattern: /\brepeat\s+the\b/gi },
  { name: "the same as", pattern: /\bthe\s+same\s+as\b/gi },
];

const HEADING = /^(#{1,6})\s/;
const BOLD_START = /\*\*The owner['’]s steps/;
const HEADING_START = /owner['’]s steps/i;
const FENCE = /^\s*(`{3,}|~{3,})/;
/** A bold line's block is below every heading: any heading ends it. */
const BELOW_HEADINGS = 7;

/** The blocks of the owner's steps in a Markdown text: each block's first and last line (numbers from 1). */
export function blocks(text) {
  const lines = text.split("\n").map(line => line.replace(/\r$/, ""));
  const found = [];
  let block = null;
  let fence = null;
  lines.forEach((line, i) => {
    const mark = line.match(FENCE)?.[1];
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && !line.trim().slice(mark.length)) fence = null;
      if (block) block.end = i + 1;
      return;
    }
    if (mark) fence = mark;
    const heading = line.match(HEADING);
    if (heading && block && heading[1].length <= block.level) block = null;
    if (!block && heading && HEADING_START.test(line)) {
      block = { start: i + 1, end: i + 1, level: heading[1].length };
      found.push(block);
    } else if (!block && !heading && BOLD_START.test(line)) {
      block = { start: i + 1, end: i + 1, level: BELOW_HEADINGS };
      found.push(block);
    }
    if (block) block.end = i + 1;
  });
  return found.map(({ start, end }) => ({ start, end }));
}

/** The text of lines `start` to `end` (numbers from 1) as the check reads it: a fenced code block's lines empty, a
 *  link as its text alone, no `*` of emphasis. Each line keeps its place, so an index still gives its line. */
function readable(lines, start, end) {
  let fence = null;
  return lines.slice(start - 1, end).map(line => {
    const mark = line.match(FENCE)?.[1];
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && !line.trim().slice(mark.length)) fence = null;
      return "";
    }
    if (mark) {
      fence = mark;
      return "";
    }
    return line.replace(/\]\([^)\s]*\)/g, "").replace(/\[/g, "").replace(/\*/g, "");
  }).join("\n");
}

/** The phrases of PATTERNS in the blocks of the owner's steps of a Markdown text, each with its line (from 1), in the
 *  order of the lines. */
export function refusals(text) {
  const lines = text.split("\n").map(line => line.replace(/\r$/, ""));
  const found = [];
  for (const { start, end } of blocks(text)) {
    const block = readable(lines, start, end);
    for (const { pattern } of PATTERNS) {
      for (const m of block.matchAll(pattern)) {
        const line = start + block.slice(0, m.index).split("\n").length - 1;
        found.push({ line, phrase: m[0].replace(/\s+/g, " ") });
      }
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

/** The Markdown files that the check reads, as paths from `root` with `/`: every one under docs/, and each app's and
 *  package's README. */
export function documents(root) {
  const found = [];
  const walk = folder => {
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".md")) found.push(path);
    }
  };
  if (existsSync(join(root, "docs"))) walk("docs");
  for (const parent of ["apps", "packages"]) {
    if (!existsSync(join(root, parent))) continue;
    for (const entry of readdirSync(join(root, parent), { withFileTypes: true })) {
      const path = `${parent}/${entry.name}/README.md`;
      if (entry.isDirectory() && existsSync(join(root, path))) found.push(path);
    }
  }
  return found.sort();
}

if (import.meta.main) {
  const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");
  let count = 0;
  let refused = 0;
  const files = documents(root);
  for (const path of files) {
    const text = readFileSync(join(root, path), "utf8");
    count += blocks(text).length;
    for (const { line, phrase } of refusals(text)) {
      console.log(`${path}:${line}: "${phrase}" sends the reader ` +
        "elsewhere. Write the step's URL, clicks and values on its own line.");
      refused++;
    }
  }
  console.log(refused
    ? `owner-steps: FAIL ${refused} refusals in the owner's steps`
    : `owner-steps: PASS ${count} blocks of the owner's steps in ${files.length} Markdown files`);
  process.exit(refused ? 1 : 0);
}
