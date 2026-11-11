// Each block of the owner's steps is self-contained: a step names its own URL, clicks and values, and does not send
// the reader to another section, another design or another site's setup for what to do. This check reads every
// Markdown file under docs/ and each app's and package's README (apps/*/README.md, packages/*/README.md).
//
// A block starts at a line that holds `**The owner's steps`, or at a heading that holds "owner's steps" (any case). A
// heading's block runs to the next heading of the same or a higher level. A bold line's block runs to the next
// heading of any level. In a block, the check refuses each phrase of PATTERNS: each sends the reader elsewhere for
// what to do. A link to a page for the reader's information stays allowed: the check reads a link's text, not its
// target. A fenced code block does not count. A phrase may wrap from one line to the next. Where two phrases overlap,
// the check refuses the first one only. The rules of a fenced code block and of a link's target are the width check's
// (scripts/doc-widths.mjs).
//
// The check reads the decision logs (docs/decisions/) too. They are history: a past entry keeps its words, so a
// refusal there calls for a decision on the check's scope, not for a rewrite.
//
//   node scripts/owner-steps.mjs [ROOT]
//
// It prints each refusal with its file, its line and the phrase, and exits 1 when there is one. ROOT is the
// repository's root (the default: this script's). npm run check:all runs it (scripts/check-all.mjs).
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { LINK_TARGET, prose } from "./doc-widths.mjs";

/** A word that does not end a sentence or a clause: the words of one phrase stay in one sentence. */
const WORD = String.raw`\S*[^\s.:;!?]`;

/** The phrases that send the reader elsewhere for what to do. Each is short and exact: a wider one refuses steps that
 *  are complete. */
export const PATTERNS = [
  /\bsteps\s+of\s+section\b/gi,
  /\bas\s+section\s+\d+/gi,
  new RegExp(String.raw`\bas\s+(?:${WORD}\s+){1,6}?does\b`, "gi"), // as … does
  new RegExp(String.raw`\bas\s+(?:${WORD}\s+){0,4}?\S*['’]s\s+(?:${WORD}\s+){0,4}?has\b`, "gi"), // as …'s … has
  /\bas\s+design\s+\d+(?:['’]s\s+["“][^"”]*["”])?\s+lists\b/gi, // with or without a section's title
  /\brepeat\s+the\b/gi,
  /\bthe\s+same\s+as\b/gi,
];

const HEADING = /^(#{1,6})\s/;
const BOLD_START = /\*\*The owner['’]s steps/;
const HEADING_START = /owner['’]s steps/i;

/** The blocks of the owner's steps in the lines of `prose`: each block's first and last line (numbers from 1). */
function blocksInLines(lines) {
  const found = [];
  let block = null;
  let level = 0;
  lines.forEach((line, i) => {
    const heading = line.match(HEADING)?.[1].length;
    if (block && heading !== undefined && heading <= level) block = null;
    if (!block && (heading ? HEADING_START.test(line) : BOLD_START.test(line))) {
      block = { start: i + 1, end: i + 1 };
      level = heading ?? Infinity; // a bold line's block is below every heading: any heading ends it
      found.push(block);
    }
    if (block) block.end = i + 1;
  });
  return found;
}

/** The blocks of the owner's steps in a Markdown text: each block's first and last line (numbers from 1). */
export const blocks = text => blocksInLines(prose(text));

/** The phrases of PATTERNS in the blocks of the owner's steps of a Markdown text, each with its line (from 1), in the
 *  order of the text. The check reads a link as its text alone, with no `*` of emphasis. Of two phrases that overlap,
 *  the one that starts first counts (the longer one, when both start at one place). */
export function refusals(text) {
  const lines = prose(text);
  const found = [];
  for (const { start, end } of blocksInLines(lines)) {
    const block = lines.slice(start - 1, end).map(line => line.replace(LINK_TARGET, "").replace(/[[*]/g, ""))
      .join("\n");
    const matches = PATTERNS.flatMap(pattern => [...block.matchAll(pattern)])
      .sort((a, b) => a.index - b.index || b[0].length - a[0].length);
    let free = 0;
    for (const m of matches) {
      if (m.index < free) continue;
      free = m.index + m[0].length;
      found.push({ line: start + block.slice(0, m.index).split("\n").length - 1, phrase: m[0].replace(/\s+/g, " ") });
    }
  }
  return found;
}

/** The Markdown files that the check reads, as paths from `root` with `/`: every one under docs/, and each app's and
 *  package's README. */
export function documents(root) {
  const docs = existsSync(join(root, "docs"))
    ? readdirSync(join(root, "docs"), { recursive: true, withFileTypes: true })
      .filter(f => f.isFile() && f.name.endsWith(".md"))
      .map(f => relative(root, join(f.parentPath, f.name)).split(sep).join("/"))
    : [];
  const readmes = ["apps", "packages"]
    .flatMap(parent => (existsSync(join(root, parent)) ? readdirSync(join(root, parent)) : [])
      .map(name => `${parent}/${name}/README.md`))
    .filter(path => existsSync(join(root, path)));
  return [...docs, ...readmes].sort();
}

if (import.meta.main) {
  const root = process.argv[2] ?? join(import.meta.dirname, "..");
  let count = 0;
  let refused = 0;
  const files = documents(root);
  for (const path of files) {
    const text = readFileSync(join(root, path), "utf8");
    count += blocks(text).length;
    for (const { line, phrase } of refusals(text)) {
      console.log(`${path}:${line}: "${phrase}" sends the reader elsewhere. ` +
        "Write the URL, the clicks and the values in the step itself.");
      refused++;
    }
  }
  console.log(refused
    ? `owner-steps: FAIL ${refused} refusal${refused === 1 ? "" : "s"} in the owner's steps`
    : `owner-steps: PASS ${count} blocks of the owner's steps in ${files.length} Markdown files`);
  process.exit(refused ? 1 : 0);
}
