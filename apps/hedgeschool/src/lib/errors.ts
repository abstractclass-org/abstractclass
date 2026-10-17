/** A caught error as text for the page: its message, without the "Error: " that String() puts before it. */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
