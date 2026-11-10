// Text that a player types into a field before the page's code runs. A prerendered page shows its fields at once, and
// its code starts later, on a slow device or network some seconds later. Svelte's binding takes the field's text when
// the page starts, but no handler heard the keys (Enter's change event among them), and the page's first update can
// write over the field. Cyanotype's board editor reads its position field this way (its design 33). Hedge School's
// editor shows its field only once the engine has drawn the position, after its code runs.
import { tick } from "svelte";

/** The text that the player typed into `input` before the page's code ran, or "" when the field holds what the page
 *  rendered. Call it when the page starts (onMount). */
export function typedEarly(input: Pick<HTMLInputElement, "value" | "defaultValue">): string {
  return input.value !== input.defaultValue ? input.value : "";
}

/** When the player typed into `input` before the page's code ran: `read(text)` after the page's first update, so that
 *  the page reads the text as its change event would have, and the first update does not write over it. Call it when
 *  the page starts (onMount). */
export function readTypedEarly(input: Pick<HTMLInputElement, "value" | "defaultValue">, read: (text: string) => void): void {
  const text = typedEarly(input);
  if (text) void tick().then(() => read(text));
}
