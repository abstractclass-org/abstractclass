// The PostHog helper's own cases (posthog.ts). They need no browser.
import { gzipSync } from "node:zlib";
import { expect, test } from "./page-log.ts";
import { events, inSendingOrder, named } from "./posthog.ts";

/** A body as posthog-js sends it: a gzip of a JSON batch. */
const body = (...list: { uuid: string; event: string; time: number; export_kind?: string }[]) =>
  gzipSync(JSON.stringify(list.map(({ uuid, event, time, ...rest }) => ({ uuid, event, properties: { $time: time, ...rest } }))));

test("a page-leave beacon's events take their place by their time, not after the route's", () => {
  // The case that failed: the page's last export left in its page-leave beacon, which came after the route's events.
  const sent = events("/e/", body(
    { uuid: "1", event: "export", time: 100.001, export_kind: "review_file" },
    { uuid: "3", event: "export", time: 100.003, export_kind: "review_file" },
    { uuid: "5", event: "$pageleave", time: 100.005 },
  ));
  const beacon = body(
    { uuid: "2", event: "export", time: 100.002, export_kind: "record_file" },
    { uuid: "4", event: "export", time: 100.004, export_kind: "record_file" },
  );
  const all = inSendingOrder(sent, [{ path: "/e/", body: beacon }]);
  expect(all.map(e => e.uuid)).toEqual(["1", "2", "3", "4", "5"]);
  expect(named(all, "export")).toEqual([
    { export_kind: "review_file" }, { export_kind: "record_file" }, { export_kind: "review_file" }, { export_kind: "record_file" },
  ]);
});

test("beacons out of order, and an event that came twice, keep one event each in the order of their times", () => {
  const first = body({ uuid: "a", event: "feature", time: 5 }, { uuid: "c", event: "feature", time: 7 });
  const second = body({ uuid: "b", event: "feature", time: 6 }, { uuid: "c", event: "feature", time: 7 });
  const all = inSendingOrder(events("/e/", second), [{ path: "/e/", body: first }, { path: "/e/", body: second }]);
  expect(all.map(e => e.uuid)).toEqual(["a", "b", "c"]);
});

test("events of one time keep the order in which they came", () => {
  const all = inSendingOrder(events("/e/", body(
    { uuid: "x", event: "feature", time: 1 }, { uuid: "y", event: "feature", time: 1 }, { uuid: "z", event: "feature", time: 1 },
  )), []);
  expect(all.map(e => e.uuid)).toEqual(["x", "y", "z"]);
});

test("an event without its time or its id is refused", () => {
  const plain = (e: object) => Buffer.from(JSON.stringify([e]));
  expect(() => events("/e/", plain({ uuid: "u", event: "feature", properties: {} }))).toThrow(/without its time/);
  expect(() => events("/e/", plain({ event: "feature", properties: { $time: 1 } }))).toThrow(/without its uuid/);
});
