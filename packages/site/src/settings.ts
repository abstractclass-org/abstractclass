// The settings panels' parts (the review's display and engine settings, Practice's display settings): a section's
// heading, a switch, and a setting's id from its label.
export const SETTINGS_HEAD = "mt-2 first:mt-0 pb-0.5 text-xs font-semibold uppercase tracking-wide text-muted border-b border-line";
export const SWITCH = "flex-none inline-flex items-center w-9 h-5 p-0 rounded-full border border-line bg-panel-2 transition-colors data-[state=checked]:bg-accent data-[state=checked]:border-accent";
export const SWITCH_THUMB = "block size-3.5 rounded-full bg-ink transition-transform translate-x-0.5 data-[state=checked]:translate-x-[1.1rem] data-[state=checked]:bg-on-badge";

/** A setting's id, from its label. */
export const settingId = (label: string) => `setting-${label.replace(/\W+/g, "-").toLowerCase()}`;
