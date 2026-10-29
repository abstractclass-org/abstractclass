// The engine's CPU module in Node, through the engine's own library, as a worker runs it (worker.ts): for the checks
// that run outside a browser. It reads what fetch-engine.mjs wrote to a site's static/engine. Both sites take it:
// Hedge School's and Drawing Board's checks and scripts.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { libraryOf, modelOf, moduleOf } from "./client.ts";
import { loadLibrary } from "./library.ts";

/** The manifest of static/engine under `root`, and `call`, which sends a request to the CPU module and parses its reply.
 *  With `network` (a network's id in the manifest), the module has that network, for analyses. The types are for the
 *  sites' tests, which import this module (TypeScript checks it there).
 *  @param {string} root
 *  @param {{ network?: string }} [options] */
export async function nodeEngine(root, { network } = {}) {
  const manifest = JSON.parse(readFileSync(join(root, "static", "engine", "manifest.json"), "utf8"));
  const module = moduleOf(manifest), library = libraryOf(manifest);
  if (!module || !library) throw new Error("static/engine/manifest.json lacks the engine module or its library");
  const lib = await loadLibrary(pathToFileURL(join(root, "static", library.url)).href);
  const engine = await lib.createCpuEngine(await WebAssembly.compile(readFileSync(join(root, "static", module.url))));
  if (network) {
    const model = modelOf(manifest, network);
    if (!model) throw new Error(`static/engine/manifest.json has no network ${network}`);
    engine.setModel(readFileSync(join(root, "static", model.url)));
    const loaded = JSON.parse(engine.call({ id: "load", action: "load_model", name: network })); // as the worker loads it
    if (loaded.error) throw new Error(`load_model ${network}: ${loaded.error}`);
  }
  return { manifest, module, call: (/** @type {object} */ request) => JSON.parse(engine.call(request)) };
}

/** Whether a site's static/engine holds an engine (fetch-engine.mjs ran): the checks that need it skip without it.
 *  @param {string} root */
export const hasEngine = root => existsSync(join(root, "static", "engine", "manifest.json"));

/** The engine repository's checkout beside this repository's, found from `from` up: `engines/` beside an ancestor,
 *  as the organization's folder holds both (also from a worktree, which is deeper). Null when there is none (CI).
 *  @param {string} from */
export function enginesCheckout(from) {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    const found = join(dir, "engines");
    if (existsSync(join(found, "games")) && existsSync(join(found, "runs"))) return found;
    if (dirname(dir) === dir) return null;
  }
}
