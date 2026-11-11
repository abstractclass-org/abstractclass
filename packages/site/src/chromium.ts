// Playwright's Chromium off the GPU, for the sites' browser tests and scripts (docs/working-notes.md, "The GPU in
// Playwright's Chromium"): Hedge School's layout test (its playwright.config.ts), and the scripts that take its launch
// options or draw a site's pictures (Cyanotype's scripts/brand.mjs). For Node.

/** Chromium's switches off the GPU on Windows: with them, no process of the browser opens a GPU adapter, and the
 *  engines' training keeps the GPU. Elsewhere none: the Linux runs of the Tests workflow keep Chromium's defaults. */
export const OFF_THE_GPU: readonly string[] = process.platform === "win32"
  ? ["--disable-gpu", "--disable-d3d11", "--disable-gpu-process-for-dx12-info-collection", "--disable-software-rasterizer"]
  : [];
