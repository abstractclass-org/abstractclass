// Checks the parsing of Chrome's trace, the long tasks, the verdict on pairs and the preview's header rules (speed.mjs),
// on recorded inputs and static/_headers. Run: npm test.
//   - tests/fixtures/review-reload-trace.json: Chrome's trace of a reload of the stored review, in Playwright's Chromium
//     (the build of abscls-3nr), cut to the events that the parsing reads: the marks, the main thread's tasks and
//     paints of the first draw and three on each side of it, eight tasks of other threads inside it, and the eight
//     `DoDigest` events. FIRST_DRAW is its first draw as review-first-frame.mjs read it before speed.mjs, on the whole
//     trace.
//   - the pairs of decisions/product.md, "The review's first frame", and of decisions/engine.md, "The network checked
//     once for a page".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eventTime, headerRules, longTasks, median, tasksBetween, verdict } from "./speed.mjs";

const trace = JSON.parse(readFileSync("tests/fixtures/review-reload-trace.json", "utf8"));
// The first draw's tasks: each task's start, wall time and thread time, in milliseconds.
const FIRST_DRAW = [
  [0, 77.752, 53.696], [77.847, 0.01, 0.008], [77.862, 42.003, 23.374], [119.888, 0.002, 0.002], [119.894, 0.001, 0.001],
  [119.897, 0.001, 0.001], [119.901, 0.047, 0.032], [119.954, 0.011, 0.009], [119.969, 0.006, 0.006],
  [119.979, 15.948, 11.15], [135.941, 0.005, 0.005], [135.95, 1.152, 0.721], [137.113, 0.002, 0.003],
  [137.119, 34.487, 29.397], [171.622, 0.128, 0.127], [171.819, 0.01, 0.009], [171.833, 0.012, 0.012],
  [171.848, 0.001, 0.001], [171.851, 0.047, 0.046], [171.924, 0.003, 0.002], [171.929, 0.004, 0.004],
  [171.939, 0.041, 0.039], [171.984, 0.002, 0.001], [171.994, 0.006, 0.005], [172.002, 0.001, 0.001],
  [172.007, 0.096, 0.093], [172.107, 4.8, 4.075],
].map(([at, wall, thread]) => ({ at, wall, thread }));

test("the tasks from the one that holds a mark to the end of the frame after the one that holds another", () => {
  assert.deepEqual(tasksBetween(trace, "review:shown", "review:moves", { paint: true }), FIRST_DRAW);
});

test("without the paint, the tasks end with the one that holds the second mark", () => {
  assert.deepEqual(tasksBetween(trace, "review:shown", "review:moves"), FIRST_DRAW.slice(0, 14));
  assert.deepEqual(tasksBetween(trace, "review:shown", "review:shown"), FIRST_DRAW.slice(0, 1));
});

test("a task that runs inside another counts once, in the outer task", () => {
  const shown = trace.traceEvents.find(e => e.name === "review:shown");
  const outer = trace.traceEvents.find(e => e.name === "ThreadControllerImpl::RunTask" && e.pid === shown.pid && e.tid === shown.tid &&
                                            e.ts <= shown.ts && shown.ts <= e.ts + e.dur);
  const inner = { ...outer, ts: outer.ts + 1000, dur: 5000, tdur: 4000 };
  assert.deepEqual(tasksBetween({ traceEvents: [...trace.traceEvents, inner] }, "review:shown", "review:moves", { paint: true }), FIRST_DRAW);
});

test("a trace without a mark, or without the paint after it, gives null", () => {
  assert.equal(tasksBetween(trace, "review:shown", "review:lost"), null);
  const unpainted = { traceEvents: trace.traceEvents.filter(e => e.name !== "Paint") };
  assert.equal(tasksBetween(unpainted, "review:shown", "review:moves", { paint: true }), null);
});

test("the long tasks pass 50 ms: how many, their time beyond it, and the longest task", () => {
  assert.deepEqual(longTasks([20, 60, 50, 75]), { count: 2, beyond: 35, longest: 75 });
  assert.deepEqual(longTasks([]), { count: 0, beyond: 0, longest: 0 });
});

test("a named event's time adds its events on every thread", () => {
  assert.deepEqual(eventTime(trace, "DoDigest"), { count: 8, wall: 23.046, thread: 22.865 });
  assert.deepEqual(eventTime(trace, "review:lost"), { count: 0, wall: 0, thread: 0 });
});

// The first draw's longest task, the median of each set of 5 reloads, in 5 pairs [before, after]: by thread time and
// by wall time.
const LONGEST_THREAD = [[46.094, 34.199], [49.899, 35.489], [44.253, 26.322], [53.352, 32.957], [49.185, 40.41]];
const LONGEST_WALL = [[83.702, 156.861], [139.832, 101.285], [89.691, 59.4], [233.312, 84.247], [110.381, 104.156]];
// The SHA-256 checks' processor time at each start, in milliseconds: the network Lite, with the HTTP cache empty.
const HASHING = [[10.6, 2.6], [11.4, 2.6], [11.1, 2.6], [11.6, 2.6], [11.3, 2.6]];
const round = (x, places = 0) => Math.round(x * 10 ** places) / 10 ** places;
const rounded = (v, places) => JSON.parse(JSON.stringify(v), (_, x) => typeof x === "number" ? round(x, places) : x);

test("the pairs show a change when they all agree, by at least the larger spread", () => {
  assert.deepEqual(rounded(verdict(LONGEST_THREAD), 3), {
    diffs: [-11.895, -14.41, -17.931, -20.395, -8.775], diff: -14.41,
    a: { median: 49.185, spread: 9.099 }, b: { median: 34.199, spread: 14.088 }, agree: true, change: true });
  assert.deepEqual(rounded(verdict(HASHING), 1), {
    diffs: [-8, -8.8, -8.5, -9, -8.7], diff: -8.7, a: { median: 11.3, spread: 1 }, b: { median: 2.6, spread: 0 }, agree: true, change: true });
});

test("pairs that disagree show no change", () => {
  const v = verdict(LONGEST_WALL);
  assert.deepEqual(v.diffs.map(d => round(d)), [73, -39, -30, -149, -6]);
  assert.equal(v.agree, false);
  assert.equal(v.change, false);
});

test("pairs that agree by less than a build's spread show no change", () => {
  const v = verdict([[10, 9], [14, 13], [12, 11]]);
  assert.equal(v.agree, true);
  assert.equal(v.change, false);
});

test("the median of an even count is the mean of the middle two", () => {
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([3, 1, 2]), 2);
});

test("the preview's headers of a path come from the rules of _headers that match it", () => {
  const rules = headerRules("static");
  const headers = path => Object.assign({}, ...rules.filter(r => r.pattern.test(path)).map(r => r.set));
  const immutable = { "Cache-Control": "public, max-age=31536000, immutable" };
  assert.deepEqual(headers("/_app/immutable/chunks/a.js"), immutable);
  assert.deepEqual(headers("/engine/b10c128-s66625408-d13350730/model-float16.bin"), immutable);
  assert.deepEqual(headers("/engine/manifest.json"), {});
  assert.deepEqual(headers("/bookmarklet.js"), { "Cache-Control": "no-cache" });
  assert.deepEqual(headers("/review"), {}); // the rules for Cloudflare's own hosts match no path
});
