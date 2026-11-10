// The review's display settings (display.ts), by the sites' test (@abstractclass/review/testing/display.ts). Run:
// npm test.
import { registerHooks } from "node:module";
import { testSiteDisplay } from "@abstractclass/review/testing/display.ts";

// Node cannot load the board's component (board/Board.svelte), whose module script gives the default layers. The
// layers are not under test, so the board gives none here
registerHooks({
  resolve: (specifier, context, next) => specifier === "#lib/board/Board.svelte"
    ? { url: "data:text/javascript,export const DEFAULT_LAYERS = {}", shortCircuit: true }
    : next(specifier, context),
});
const { DEFAULT_DISPLAY, loadDisplay } = await import("./display.ts");

testSiteDisplay(DEFAULT_DISPLAY, loadDisplay);
