/** A caught error as text for the page: its message, without the "Error: " that String() puts before it. */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** A caught error, or a problem's text, as the end of a whole sentence on the page: its text (errorText), ended by
 *  one period. */
export const errorSentence = (e: unknown) => errorText(e).replace(/\.?$/, ".");
