// The review's display settings (display.ts), by the sites' test (@abstractclass/review/testing/display.ts). Run:
// npm test.
import { testSiteDisplay } from "@abstractclass/review/testing/display.ts";
import { DEFAULT_DISPLAY, loadDisplay } from "./display.ts";

testSiteDisplay(DEFAULT_DISPLAY, loadDisplay);
