// Checks the texts that the record's reader notes for the error reports (texts.ts), and that the reader is the one code
// that reads a tag's value. A page that read a record with other code would skip the note, and its error reports could
// carry a typed name (Hedge School's design 17, "Error reports"). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { readRecord, type Notation } from "./record.ts";
import { readTexts } from "./texts.ts";

/** A game whose moves are any words. */
const words: Notation<null> = { read: word => ({ name: word, mark: null, markAt: word.length }), mark: () => "", none: null };

test("the reader notes each tag's and each comment's text, but one character, PGN's marks of none and a number", () => {
  readRecord('[Event "Wren\'s club night"]\n[Blue " Ann Example "]\n[Red "?"]\n[Site "-"]\n[Round "3"]\n[Komi "-7.5"]\n\n' +
             "1. apple { Ann's slip } 2. pear ( 2. plum {a variation's note} ) {5} *", words);
  assert.deepEqual([...readTexts()], ["Wren's club night", "Ann Example", "Ann's slip", "a variation's note"]);
});

/** The workspace's root: apps/ and packages/ are in it. */
const ROOT = join(import.meta.dirname, "..", "..", "..");

/** The sources of the sites and of the packages, but their tests. */
function sources(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      if (e.isDirectory()) walk(path);
      else if (/\.(ts|js|svelte)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) files.push(path);
    }
  };
  for (const top of ["apps", "packages"])
    for (const name of readdirSync(join(ROOT, top))) if (existsSync(join(ROOT, top, name, "src"))) walk(join(ROOT, top, name, "src"));
  return files;
}

/** Each regex that `file` writes: its literals, and each RegExp of a string. A Svelte file's regexes are in its
 *  scripts. */
function regexes(file: string): RegExp[] {
  let text = readFileSync(file, "utf8");
  if (file.endsWith(".svelte")) text = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
  const found: RegExp[] = [];
  const add = (source: string, flags: string) => {
    try { found.push(new RegExp(source, flags)); } catch { /* not a pattern that this engine reads */ }
  };
  const visit = (node: ts.Node) => {
    if (ts.isRegularExpressionLiteral(node)) {
      const end = node.text.lastIndexOf("/");
      add(node.text.slice(1, end), node.text.slice(end + 1));
    } else if ((ts.isNewExpression(node) || ts.isCallExpression(node)) && ts.isIdentifier(node.expression)
               && node.expression.text === "RegExp") {
      const [source, flags] = node.arguments ?? [];
      if (source && ts.isStringLiteralLike(source)) add(source.text, flags && ts.isStringLiteralLike(flags) ? flags.text : "");
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
  return found;
}

/** A tag's value, which only code that reads a tag's value captures alone. */
const VALUE = "Wren's club night";
/** The tags that the sites read and write. A regex's own words that could name a tag are tried too. */
const TAG_NAMES = ["Event", "Site", "Date", "Round", "Blue", "Red", "White", "Black", "Result", "Termination", "Position",
                   "Komi"];

/** Whether `re` captures a tag's value alone, with or without its quotes, from a record's tags. A group of a whole
 *  bracket (Constellation's start, `[B:… R:…]`) is not a tag's value. */
function readsTag(re: RegExp): boolean {
  const names = new Set([...TAG_NAMES, ...(re.source.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? [])]);
  const m = re.exec([...names].map(name => `[${name} "${VALUE}"]`).join("\n"));
  return m !== null && m.slice(1).some(group => group?.replace(/^"|"$/g, "").trim() === VALUE);
}

// It finds a reader that works by a regex. A reader of another form, such as the packed link's tags
// (@abstractclass/analysis's share.ts), notes them itself, and its own test checks that.
test("the reader is the one code that reads a tag's value from a record's text, so each record's texts are noted", () => {
  const readers = sources().filter(file => regexes(file).some(readsTag));
  assert.deepEqual(readers.map(file => relative(ROOT, file).replaceAll("\\", "/")), ["packages/record/src/record.ts"]);
});
