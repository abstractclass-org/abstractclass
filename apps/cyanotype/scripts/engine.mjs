// Cyanotype's engine step (`npm run engine [-- --deploy]`): the engine package's step (fetch-engine.mjs), with the
// site's komi limit, its record's MAX_RECORD_KOMI. The step checks each practice module's komi cap against it.
import { fetchEngine } from "@abstractclass/engine/fetch-engine.mjs";
import { MAX_RECORD_KOMI } from "../src/lib/game/record.ts";

await fetchEngine({ maxKomi: MAX_RECORD_KOMI });
