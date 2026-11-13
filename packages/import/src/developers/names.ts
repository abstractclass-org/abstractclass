// The names that the examples of the sites' pages for developers give from a site's messages' names (partners.ts).

/** The constant that holds the site's address in a partner's code: `HEDGE_SCHOOL` for the messages `hedge-school:*`. */
export const messageConstant = (messages: string): string => messages.toUpperCase().replaceAll("-", "_");
