// Hedge School's engine step (`npm run engine [-- --deploy]`): the engine package's step, with the site's komi limit.
import { fetchEngine } from "@abstractclass/engine/fetch-engine.mjs";
import { MAX_RECORD_KOMI } from "../src/lib/game/record.ts";

await fetchEngine({ maxKomi: MAX_RECORD_KOMI });
