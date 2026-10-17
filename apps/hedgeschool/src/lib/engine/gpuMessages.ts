// The messages between the page and the GPU worker (gpuWorker.ts, gpuClient.ts). One worker holds several engines,
// each a search at a time: a request names its engine. The worker's replies are every worker's (channel.ts).
import type { StoredArtifact } from "./artifacts.ts";
export type { ChannelReply as GpuReply } from "./channel.ts";

export interface GpuInit {
  type: "init";
  id: number;
  module: WebAssembly.Module; // the GPU module, compiled by the page
  library: string; // gpu_engine.mjs, the module's JavaScript half
  ortGlue: string; // ONNX Runtime Web's glue script (its WebGPU build)
  ortWasm: StoredArtifact; // and its WebAssembly
  graph: StoredArtifact; // the network as an ONNX graph
  model: Blob; // the network's file, checked by the page (client.ts, checked), which the engines read its shapes from
  name: string; // the network's id
  searches: number; // the engines
}

export type GpuRequest =
  | GpuInit
  | { type: "search"; id: number; engine: number; request: object }
  | { type: "stop"; id: number }
  | { type: "stats"; id: number }; // its reply: the network evaluations so far (the GPU library's count)
