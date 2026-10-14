// The engine's CPU module in Node, through the engine's own library, as a worker runs it (src/lib/engine/worker.ts):
// for the checks that run outside a browser. It reads what scripts/fetch-engine.mjs wrote to static/engine.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { libraryOf, moduleOf } from "../src/lib/engine/client.ts";
import { loadLibrary } from "../src/lib/engine/library.ts";

/** The manifest of static/engine under `root`, and `call`, which sends a request to the CPU module and parses its reply. */
export async function nodeEngine(root) {
  const manifest = JSON.parse(readFileSync(join(root, "static", "engine", "manifest.json"), "utf8"));
  const module = moduleOf(manifest), library = libraryOf(manifest);
  if (!module || !library) throw new Error("static/engine/manifest.json lacks the engine module or its library");
  const lib = await loadLibrary(pathToFileURL(join(root, "static", library.url)).href);
  const engine = await lib.createCpuEngine(await WebAssembly.compile(readFileSync(join(root, "static", module.url))));
  return { manifest, module, call: request => JSON.parse(engine.call(request)) };
}
