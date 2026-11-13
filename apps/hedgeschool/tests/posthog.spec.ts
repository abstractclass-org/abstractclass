// The PostHog helper's own cases (posthog.ts): they read made-up events, and open no page.
import { gzipSync } from "node:zlib";
import { expect, test } from "./page-log.ts";
import { inCaptureOrder, type Sent } from "./posthog.ts";

/** A UUIDv7 of the millisecond `ms` and the count `count` in it. posthog-js starts its count at a random value, and
 *  only the order of the counts matters. */
const id = (ms: number, count = 0) => {
  const t = ms.toString(16).padStart(12, "0");
  return `${t.slice(0, 8)}-${t.slice(8)}-7${count.toString(16).padStart(3, "0")}-8000-000000000000`;
};

/** An event as posthog-js sends it, with the id `uuid`. */
const event = (uuid: string) => ({ uuid, event: "export", properties: {} });

/** The events with these ids, as the route keeps them. */
const sent = (...uuids: string[]): Sent[] => uuids.map(uuid => ({ path: "/e/", ...event(uuid) }));

/** A beacon's body as posthog-js sends it, a gzip of a JSON batch, with the events of these ids. */
const beacon = (...uuids: string[]) => ({ path: "/e/", body: gzipSync(JSON.stringify({ batch: uuids.map(event) })) });

/** The ids of the events, in their order. */
const ids = (all: Sent[]) => all.map(e => e.uuid);

test("a page-leave beacon's events take their place by their capture, not after the route's", () => {
  // The case that failed: a page's last exports left in its page-leave beacon, which came after the route's events.
  expect(ids(inCaptureOrder(sent(id(1), id(3), id(5)), [beacon(id(2), id(4))])))
    .toEqual([id(1), id(2), id(3), id(4), id(5)]);
});

test("events of one millisecond, by the route and by a beacon, keep the order of their capture", () => {
  expect(ids(inCaptureOrder(sent(id(7, 1)), [beacon(id(7, 0), id(7, 2))]))).toEqual([id(7, 0), id(7, 1), id(7, 2)]);
});

test("beacons out of order, and an event that came twice, keep one event each in the order of their capture", () => {
  const first = beacon(id(5), id(7));
  const second = beacon(id(6), id(7));
  expect(ids(inCaptureOrder(sent(id(6), id(7)), [first, second]))).toEqual([id(5), id(6), id(7)]);
});

test("an event without its id, or with an id that is not a UUIDv7, is refused", () => {
  const plain = (e: object) => ({ path: "/e/", body: Buffer.from(JSON.stringify([e])) });
  expect(() => inCaptureOrder([], [plain({ event: "feature", properties: {} })])).toThrow(/without its uuid/);
  expect(() => inCaptureOrder(sent("550e8400-e29b-41d4-a716-446655440000"), [])).toThrow(/not a UUIDv7/);
});
