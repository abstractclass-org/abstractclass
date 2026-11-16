// The constants that each site's build defines (its vite.config.ts) and its src/app.d.ts declares, for the type check
// of tests/ (tests/tsconfig.json). The tests load a site's modules in Node, outside the build: there these constants
// are not defined, and the modules read them only after a typeof check (apps/cyanotype/src/lib/site.ts).
declare const __SITE_VERSION__: string | undefined;
declare const __ENGINE_FILES__: string | undefined;
