// The documents wrap at 120 characters (docs/working-notes.md). This check refuses an added line over 120 in the
// repository's Markdown files between two commits. The Tests workflow runs it on the pushed range.
//   node scripts/doc-widths.mjs <from> [<to>]     (<to>: HEAD by default)
// A line may be longer where it cannot wrap: a table row, a line in a code block, or a line whose length comes from
// URLs (a link's target, `<https://…>`, a bare URL). The text around a URL still counts. Code keeps its own lengths.
// Tests: node --test "scripts/*.test.mjs"
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

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
		if (!added.has(i + 1) || chars(line) <= WIDTH) return;
		if (line.trimStart().startsWith("|") || chars(withoutUrls(line)) <= WIDTH) return;
		found.push({ line: i + 1, chars: chars(line) });
	});
	return found;
}

/** Each file's added lines (numbers from 1), from `git diff --unified=0 --no-prefix`. */
export function addedLines(diff) {
	const files = new Map();
	let lines = null;
	for (const line of diff.split("\n")) {
		if (line.startsWith("+++ ")) {
			const path = line.slice(4);
			lines = path === "/dev/null" ? null : new Set();
			if (lines) files.set(path, lines);
			continue;
		}
		const hunk = line.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
		if (hunk && lines) {
			const start = Number(hunk[1]);
			const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
			for (let n = start; n < start + count; n++) lines.add(n);
		}
	}
	return files;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const [from, to = "HEAD"] = process.argv.slice(2);
	if (!from) {
		console.error("usage: node scripts/doc-widths.mjs <from> [<to>]");
		process.exit(2);
	}
	const git = (...args) => execFileSync("git", ["-c", "core.quotePath=false", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
	const files = addedLines(git("diff", "--unified=0", "--no-prefix", "--no-color", "--no-renames", from, to, "--", "*.md"));
	let count = 0;
	let refused = 0;
	for (const [path, added] of files) {
		count += added.size;
		for (const { line, chars: n } of overlong(git("show", `${to}:${path}`), added)) {
			console.log(`${path}:${line}: ${n} characters (at most ${WIDTH})`);
			refused++;
		}
	}
	const range = `${from}..${to}`;
	console.log(refused
		? `doc-widths: FAIL ${refused} added lines over ${WIDTH} characters in ${range}`
		: `doc-widths: PASS ${count} added lines in ${files.size} Markdown files in ${range}`);
	process.exit(refused ? 1 : 0);
}
