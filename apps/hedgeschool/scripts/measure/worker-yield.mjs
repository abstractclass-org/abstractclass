// The time of a worker's yield between two slices of a search (packages/engine/src/channel.ts, searchInSlices), in a tab in
// front and in a hidden tab, in Chromium and Edge (decisions/product.md, "A review in a hidden tab"). A worker in an
// empty page yields `COUNT` times in a chain, as a search does between its slices, in two ways: by a timer of 0 ms (a
// timer set in the task of the timer before it: after the fifth, the browser waits 4 ms at least), and by a message
// that the worker sends itself on a channel of its own. Each yield is timed from its start to the task that it waits
// for. Then the stop: the worker runs slices of 50 ms with a yield by a message between them, and the page posts a stop
// during a slice, `STOPS` times. The worker should end at the first yield after the stop arrives: no slice starts after
// the page posts the stop. The worker reads the stop only between slices, so a slice that starts after the post shows a
// stop that came after the worker's own message. Each browser starts headless, with a new profile, whose tab can be
// hidden (speed.mjs, launchHideable). The tab is hidden by a new tab in front, and each set-up checks
// document.visibilityState.
//
//   node scripts/measure/worker-yield.mjs [browsers] [port]
//
// browsers: a list from chromium and msedge (by default both).
import { createServer } from "node:http";
import { launchHideable, median } from "./speed.mjs";

const browsers = (process.argv[2] ?? "chromium,msedge").split(","), port = Number(process.argv[3] ?? 4395);
const COUNT = 200, STOPS = 20;

const server = createServer((_, res) => res.writeHead(200, { "content-type": "text/html" }).end("<!doctype html><title>yield</title>"));
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

/** In the page: each yield's time in a worker, in milliseconds, for `kind` (timer or message). */
function yields({ kind, count }) {
  const source = `onmessage = async ({ data: { kind, count } }) => {
    const timer = () => new Promise(resolve => setTimeout(resolve, 0));
    const message = () => new Promise(resolve => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = () => { port1.close(); resolve(); };
      port2.postMessage(null);
    });
    const next = kind === "timer" ? timer : message, times = [];
    for (let k = 0; k < count; k++) { const t = performance.now(); await next(); times.push(performance.now() - t); }
    postMessage(times);
  };`;
  const worker = new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
  return new Promise(resolve => {
    worker.onmessage = e => { worker.terminate(); resolve({ times: e.data, visibility: document.visibilityState }); };
    worker.postMessage({ kind, count });
  });
}

/** In the page: for each stop, the slices that started after the page posted it (0 when the stop ends the search at the
 *  next yield), and the time from its post to the search's end, in milliseconds. */
async function stops({ count }) {
  const source = `onmessage = ({ data }) => {
    if (data === "stop") { self.stopped = true; return; }
    self.stopped = false;
    const message = () => new Promise(resolve => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = () => { port1.close(); resolve(); };
      port2.postMessage(null);
    });
    (async () => {
      const starts = [];
      for (;;) {
        starts.push(performance.timeOrigin + performance.now());
        for (const end = performance.now() + 50; performance.now() < end;); // a slice
        postMessage({ slice: starts.length });
        await message();
        if (self.stopped) break;
      }
      postMessage({ starts, ended: performance.timeOrigin + performance.now() });
    })();
  };`;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  const one = () => new Promise(resolve => {
    const worker = new Worker(url);
    let posted = 0;
    worker.onmessage = ({ data }) => {
      if (data.slice === 3) { posted = performance.timeOrigin + performance.now(); worker.postMessage("stop"); } // in the fourth slice
      if (data.ended) {
        worker.terminate();
        resolve({ after: data.starts.filter(t => t > posted).length, ms: data.ended - posted });
      }
    };
    worker.postMessage("start");
  });
  const out = [];
  for (let k = 0; k < count; k++) out.push(await one());
  return { out, visibility: document.visibilityState };
}

for (const channel of browsers) {
  const b = await launchHideable({ channel, port: 9470 });
  try {
    await b.page.goto(`http://127.0.0.1:${port}/`);
    for (const setup of ["front", "hidden"]) {
      if (setup === "hidden") { await b.hide(); await new Promise(resolve => setTimeout(resolve, 2000)); }
      for (const kind of ["timer", "message"]) {
        const { times, visibility } = await b.page.evaluate(yields, { kind, count: COUNT });
        const late = times.slice(5); // from the sixth yield on, after the browser's clamp of chained timers
        console.log(`${channel} ${setup} (${visibility}), ${kind}: the first 5 yields ${times.slice(0, 5).map(t => t.toFixed(2)).join(", ")} ms; ` +
                    `the rest median ${median(late).toFixed(2)} ms, longest ${Math.max(...late).toFixed(2)} ms`);
      }
      const { out, visibility } = await b.page.evaluate(stops, { count: STOPS });
      console.log(`${channel} ${setup} (${visibility}), the stop: slices started after its post ${Math.max(...out.map(o => o.after))} at most; ` +
                  `from the stop to the search's end median ${median(out.map(o => o.ms)).toFixed(1)} ms, longest ${Math.max(...out.map(o => o.ms)).toFixed(1)} ms`);
    }
  } finally {
    await b.close();
  }
}
server.close();
