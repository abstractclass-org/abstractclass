// The device's facts for the engine measure (measure.ts): what the browser gives a page about the processor, the
// memory, the power, the browser itself, the GPU adapter and JSPI. A browser gives some of them only: each is null or
// "not given" where it does not.
import { hasJspi } from "@abstractclass/engine/library.ts";
import { browserOf, type AdapterFacts, type DeviceFacts } from "./measure.ts";

type AdapterInfo = { vendor?: string; architecture?: string; device?: string; description?: string; isFallbackAdapter?: boolean };
type Adapter = { info?: AdapterInfo; isFallbackAdapter?: boolean };
type Brand = { brand: string; version: string };
type Hints = { brands?: Brand[]; getHighEntropyValues?(hints: string[]): Promise<{ fullVersionList?: Brand[]; platform?: string; platformVersion?: string; model?: string }> };
type Nav = Navigator & {
  deviceMemory?: number;
  getBattery?: () => Promise<{ charging: boolean }>;
  userAgentData?: Hints;
};

/** The adapter that WebGPU gives the page with its default options, as the GPU worker asks for it, or why none. */
export async function adapterFacts(): Promise<DeviceFacts["webgpu"]> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu;
  if (!gpu) return "none";
  const adapter = await gpu.requestAdapter().catch(() => null);
  if (!adapter) return "no adapter";
  const info = adapter.info ?? {};
  const facts: AdapterFacts = {
    vendor: info.vendor ?? "", architecture: info.architecture ?? "", device: info.device ?? "",
    description: info.description ?? "", fallback: !!(info.isFallbackAdapter ?? adapter.isFallbackAdapter),
  };
  return facts;
}

/** The browser's name and version, and the system: from the client hints where the browser gives them (Chromium's
 *  browsers), else from the user agent. A brand that only names the engine (Chromium) gives way to the browser's own. */
async function browserFacts(): Promise<{ browser: string; platform: string }> {
  const hints = (navigator as Nav).userAgentData;
  const values = await hints?.getHighEntropyValues?.(["fullVersionList", "platform", "platformVersion", "model"]).catch(() => null);
  const brands = (values?.fullVersionList ?? hints?.brands ?? []).filter(b => !/not.?a.?brand/i.test(b.brand));
  const own = brands.find(b => b.brand !== "Chromium") ?? brands[0];
  const platform = [values?.platform, values?.platformVersion, values?.model ? `(${values.model})` : ""].filter(Boolean).join(" ");
  return { browser: own ? `${own.brand} ${own.version}` : browserOf(navigator.userAgent), platform };
}

/** The device's facts. */
export async function deviceFacts(): Promise<DeviceFacts> {
  const nav = navigator as Nav;
  const [browser, webgpu, battery] = await Promise.all([
    browserFacts(), adapterFacts(), nav.getBattery?.().catch(() => null) ?? Promise.resolve(null),
  ]);
  return {
    cores: navigator.hardwareConcurrency || 1, memoryGB: nav.deviceMemory ?? null,
    power: battery ? (battery.charging ? "mains" : "battery") : null, ...browser, userAgent: navigator.userAgent,
    webgpu, jspi: hasJspi(),
  };
}
