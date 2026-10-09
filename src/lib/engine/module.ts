// The engine module (enclosure-engine.wasm) in a browser worker, after the engine repository's reference driver
// (https://github.com/seankao31/enclosure-ai/blob/main/tools/engine_run.mjs). The module needs a few WASI imports:
// the clocks, random bytes, and standard error for its log. Other imports answer "not supported".
//
// Transport: engine_alloc(len) gives a buffer for a request, engine_call(ptr, len) returns [u32 length][one JSON line],
// engine_model_buffer(len) gives a buffer for a network's bytes, which the load_model action then loads.

const SUCCESS = 0, BADF = 8, INVAL = 28, NOSYS = 52;

export interface EngineModule {
  /** One request, one reply line. Blocks the calling thread while the engine works. */
  call(request: object): string;
  /** Hands the module a network's bytes. Then send {"action": "load_model"}. */
  setModel(bytes: Uint8Array): void;
  /** The module's linear memory, in bytes. */
  memoryBytes(): number;
}

export async function loadEngine(module: WebAssembly.Module, log: (text: string) => void = () => {}): Promise<EngineModule> {
  let memory: WebAssembly.Memory | null = null;
  const view = () => new DataView(memory!.buffer);
  const decoder = new TextDecoder(), encoder = new TextEncoder();
  const wasi: Record<string, (...args: never[]) => number> = {
    args_get: () => SUCCESS,
    args_sizes_get: (a: number, b: number) => (view().setUint32(a, 0, true), view().setUint32(b, 0, true), SUCCESS),
    environ_get: () => SUCCESS,
    environ_sizes_get: (a: number, b: number) => (view().setUint32(a, 0, true), view().setUint32(b, 0, true), SUCCESS),
    clock_res_get: (_id: number, p: number) => (view().setBigUint64(p, 1000n, true), SUCCESS),
    clock_time_get(id: number, _precision: bigint, p: number) {
      if (id !== 0 && id !== 1) return INVAL;
      view().setBigUint64(p, id === 0 ? BigInt(Date.now()) * 1000000n : BigInt(Math.round(performance.now() * 1e6)), true);
      return SUCCESS;
    },
    random_get(p: number, n: number) {
      for (let i = 0; i < n; i += 65536) crypto.getRandomValues(new Uint8Array(memory!.buffer, p + i, Math.min(65536, n - i)));
      return SUCCESS;
    },
    fd_write(fd: number, iovs: number, n: number, written: number) {
      if (fd !== 1 && fd !== 2) return BADF;
      let total = 0;
      for (let i = 0; i < n; i++) {
        const p = view().getUint32(iovs + i * 8, true), len = view().getUint32(iovs + i * 8 + 4, true);
        log(decoder.decode(new Uint8Array(memory!.buffer, p, len)));
        total += len;
      }
      view().setUint32(written, total, true);
      return SUCCESS;
    },
    proc_exit(code: number) { throw new Error(`the engine exited with code ${code}`); },
    sched_yield: () => SUCCESS,
  };
  const imports: Record<string, Record<string, (...args: never[]) => number>> = { wasi_snapshot_preview1: {} };
  for (const { module: m, name } of WebAssembly.Module.imports(module))
    if (m === "wasi_snapshot_preview1")
      imports[m][name] = wasi[name] ?? (() => (name.startsWith("fd_") ? BADF : NOSYS));
  const ex = (await WebAssembly.instantiate(module, imports)).exports as {
    memory: WebAssembly.Memory;
    engine_alloc(len: number): number;
    engine_call(ptr: number, len: number): number;
    engine_model_buffer(len: number): number;
  };
  memory = ex.memory;
  return {
    call(request) {
      const bytes = encoder.encode(JSON.stringify(request));
      const ptr = ex.engine_alloc(bytes.length);
      new Uint8Array(memory!.buffer, ptr, bytes.length).set(bytes);
      const out = ex.engine_call(ptr, bytes.length);
      const len = view().getUint32(out, true);
      return decoder.decode(new Uint8Array(memory!.buffer, out + 4, len)).trimEnd();
    },
    setModel(bytes) {
      const ptr = ex.engine_model_buffer(bytes.length);
      new Uint8Array(memory!.buffer, ptr, bytes.length).set(bytes); // a fresh view: memory may have grown
    },
    memoryBytes: () => memory!.buffer.byteLength,
  };
}
