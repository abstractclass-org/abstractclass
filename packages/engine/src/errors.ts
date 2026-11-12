/** A caught error as text for the page: its message, without the "Error: " that String() puts before it. */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** A caught error, or a problem's text, as the end of a whole sentence on the page: its text (errorText), ended by
 *  one period. */
export const errorSentence = (e: unknown) => errorText(e).replace(/\.?$/, ".");

/** Why a request failed, for a script's line in Node. Node's fetch throws "fetch failed" and gives the reason as the
 *  error's cause. The cause's message comes first, because it says more than its code ("getaddrinfo ENOTFOUND
 *  example.org", not "ENOTFOUND"). Then the code, for a cause with an empty message, then the error's own text.
 *  fetch-engine.mjs and the site package's release-check.mjs both use it. */
export const fetchReason = (e: unknown) => {
  const cause = e instanceof Error ? (e.cause as { message?: unknown; code?: unknown } | undefined) : undefined;
  return String(cause?.message || cause?.code || errorText(e));
};
