// The names that the examples of the sites' pages for developers (Hedge School's design 18) give from a site's
// messages' name (partners.ts).

/** The constant that holds the site's address in a partner's code: `HEDGE_SCHOOL` for the messages `hedge-school:*`. */
export const addressConstant = (messages: string): string => messages.toUpperCase().replaceAll("-", "_");

/** The partner's save page in the examples: `https://example.com/hedge-school/save?game=123`. */
export const exampleSave = (messages: string): string => `https://example.com/${messages}/save?game=123`;
