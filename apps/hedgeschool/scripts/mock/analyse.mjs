// Candidates for every position of the fixture game from the current module (Meridian ABI), 4 worker threads.
//   node analyse.mjs WASM GAME.json VISITS OUT.json
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
if (isMainThread) {
  const [wasmPath, gamePath, visits, out] = process.argv.slice(2);
  const game = JSON.parse(readFileSync(gamePath, "utf8"));
  const bytes = readFileSync(wasmPath);
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, () => new Promise(resolve => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { bytes, visits: +visits } });
    let k = -1;
    const give = () => next < game.siteMoves.length ? w.postMessage(game.siteMoves.slice(0, k = next++)) : (w.terminate(), resolve());
    w.on("message", m => { if (m.analysis) results[k] = m.analysis; give(); });
  })));
  writeFileSync(out, JSON.stringify(results));
  console.log(`${results.filter(Boolean).length} positions analysed`);
} else {
  const module = await WebAssembly.compile(workerData.bytes);
  let memory;
  const view = () => new DataView(memory.buffer);
  const fns = { environ_get: () => 0, environ_sizes_get: (a, b) => (view().setUint32(a, 0, true), view().setUint32(b, 0, true), 0),
    clock_time_get(id, _p, p) { view().setBigUint64(p, BigInt(Math.round(performance.now() * 1e6)), true); return 0; },
    fd_write(fd, iovs, n, w) { let t = 0; for (let i = 0; i < n; i++) t += view().getUint32(iovs + i * 8 + 4, true); view().setUint32(w, t, true); return 0; },
    proc_exit(c) { throw new Error("exit " + c); } };
  const wasi = {};
  for (const { module: m, name } of WebAssembly.Module.imports(module)) if (m === "wasi_snapshot_preview1") wasi[name] = fns[name] ?? (() => name.startsWith("fd_") ? 8 : 52);
  const ex = (await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi })).exports;
  memory = ex.memory;
  const ALL = Array.from({ length: 48 * 361 }, (_, i) => i);
  const run = moves => { const b = new TextEncoder().encode(JSON.stringify({ type: "analysis", start: "[B:A10-D10 R:P10-S10]", moves, state: { legalMoves: ALL }, limits: { visits: workerData.visits } }));
    const p = ex.meridian_alloc(b.length); new Uint8Array(memory.buffer, p, b.length).set(b); const o = ex.meridian_run(p, b.length);
    const l = new DataView(memory.buffer).getUint32(o, true); return JSON.parse(new TextDecoder().decode(new Uint8Array(memory.buffer, o + 4, l))).analysis; };
  parentPort.on("message", moves => parentPort.postMessage({ analysis: run(moves) }));
  parentPort.postMessage({});
}
