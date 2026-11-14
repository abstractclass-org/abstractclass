// The build's check of the analytics' tokens (analytics.svelte.ts reads them): each site's vite.config.ts runs it, so
// a token of the wrong form fails the build, and the live site does not show its consent banner and measure nothing.
// An empty or unset value passes, as previews and local builds have none.

/** Each token that a build reads, with the form that it needs. PostHog's project token: the prefix `phc_`
 *  (PROJECT_API_TOKEN_PREFIX in PostHog's posthog/models/utils.py), then a random number in base 62 (older tokens)
 *  or base 57 (newer ones), so letters and digits of no fixed count. Cloudflare Web Analytics' token: 32 hexadecimal
 *  digits (docs/hosting.md, section 5). */
const FORMS = [
  { name: "VITE_POSTHOG_KEY", pattern: /^phc_[A-Za-z0-9]+$/,
    form: "a PostHog project token: phc_ and then letters and digits only" },
  { name: "VITE_CF_ANALYTICS_TOKEN", pattern: /^[0-9a-f]{32}$/,
    form: "a Cloudflare Web Analytics token: 32 hexadecimal digits (0-9, a-f)" },
];

/** The message for each malformed token in `env`, the build's variables. A message shows only the first 4 characters
 *  of the value. */
export function analyticsTokenProblems(env: Record<string, string | undefined>): string[] {
  return FORMS.flatMap(({ name, pattern, form }) => {
    const value = env[name];
    if (!value || pattern.test(value)) return [];
    return [`${name} starts with "${value.slice(0, 4)}", but it must be ${form}. ` +
            `Correct the value, or leave it empty.`];
  });
}

/** The check as a Vite plugin: it reads the build's resolved variables (the environment and any .env file), and
 *  stops the build when a token is malformed. */
export function analyticsTokenCheck() {
  return {
    name: "analytics-token-check",
    configResolved(config: { env: Record<string, string | undefined> }) {
      const problems = analyticsTokenProblems(config.env);
      if (problems.length) throw new Error(`The build's analytics tokens are malformed:\n${problems.join("\n")}`);
    },
  };
}
