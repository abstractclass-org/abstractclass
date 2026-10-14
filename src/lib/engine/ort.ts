// ONNX Runtime Web in a worker that runs a network's graph on the GPU (the GPU worker, and the practice bot's): its glue
// script by URL, and its WebAssembly as bytes, which the site stores compressed (artifacts.ts). One thread: the page is
// not cross-origin isolated, and the GPU does the network's work.
type Ort = { env: { wasm: { wasmPaths?: unknown; wasmBinary?: unknown; numThreads?: number } } };

export function setUpOrt(ort: Ort, glue: string, wasm: Uint8Array) {
  ort.env.wasm.wasmPaths = { mjs: glue };
  ort.env.wasm.wasmBinary = wasm;
  ort.env.wasm.numThreads = 1;
}
