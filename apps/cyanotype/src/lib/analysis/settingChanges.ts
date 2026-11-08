// The engine settings' changes as events (Hedge School's design 17), with Cyanotype's analytics and networks
// (@abstractclass/analysis/settingChanges.ts).
import { track } from "#lib/analytics.svelte.ts";
import { settingEvents } from "@abstractclass/analysis/settingChanges.ts";
import { networkName } from "./engineSettings.ts";

export const trackSettingChange = settingEvents({ track, networkName });
