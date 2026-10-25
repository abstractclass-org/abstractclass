// A key twice in one object of a package.json is no error to JSON.parse, which keeps the last one. So a merge that
// leaves two "dependencies" blocks drops the first block's packages without a word, and the workspace's links can
// still hide it. This check refuses a key that an object of a tracked package.json has twice. npm run check:all runs
// it (scripts/check-all.mjs).
//   node scripts/json-keys.mjs
// Tests: node --test "scripts/*.test.mjs"
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Each key that an object of the JSON text has twice: its path from the root, and the line of its second use. */
export function duplicateKeys(text) {
  const found = [];
  let i = 0;
  const lineAt = at => text.slice(0, at).split("\n").length;
  const space = () => { while (/\s/.test(text[i] ?? "")) i++; };
  const fail = what => { throw new SyntaxError(`${what} at line ${lineAt(i)}`); };
  const string = () => {
    if (text[i] !== '"') fail("a string expected");
    const start = i++;
    while (text[i] !== '"') {
      if (i >= text.length) fail("an unclosed string");
      i += text[i] === "\\" ? 2 : 1;
    }
    i++;
    return JSON.parse(text.slice(start, i));
  };
  const value = path => {
    space();
    if (text[i] === "{") {
      i++;
      const keys = new Set();
      space();
      if (text[i] === "}") { i++; return; }
      for (;;) {
        space();
        const at = i, key = string();
        if (keys.has(key)) found.push({ path: [...path, key].join("."), line: lineAt(at) });
        keys.add(key);
        space();
        if (text[i++] !== ":") fail("a colon expected");
        value([...path, key]);
        space();
        if (text[i] === ",") { i++; continue; }
        if (text[i++] === "}") return;
        fail("a comma or } expected");
      }
    }
    if (text[i] === "[") {
      i++;
      space();
      if (text[i] === "]") { i++; return; }
      for (let n = 0; ; n++) {
        value([...path, String(n)]);
        space();
        if (text[i] === ",") { i++; continue; }
        if (text[i++] === "]") return;
        fail("a comma or ] expected");
      }
    }
    if (text[i] === '"') { string(); return; }
    const literal = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
    if (!literal) fail("a value expected");
    i += literal[0].length;
  };
  value([]);
  return found;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = execFileSync("git", ["ls-files", "package.json", "**/package.json"], { encoding: "utf8" })
    .split("\n").filter(Boolean);
  let bad = 0;
  for (const file of files) {
    for (const { path, line } of duplicateKeys(readFileSync(file, "utf8"))) {
      console.log(`${file}:${line}: the key ${path} is there twice: JSON keeps only the last one`);
      bad++;
    }
  }
  console.log(`json-keys: ${bad ? "FAIL" : "PASS"} (${files.length} package.json files)`);
  process.exit(bad ? 1 : 0);
}
