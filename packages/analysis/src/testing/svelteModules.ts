// Lets a test in Node import a module that uses Svelte's runes (`*.svelte.ts`), as Vite does for the site: TypeScript
// removes the types, then Svelte compiles the runes for the browser. Import this first, and the module after it by a
// dynamic import: a static import loads before this runs.
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { compileModule } from "svelte/compiler";

registerHooks({
  load(url, context, next) {
    if (!url.endsWith(".svelte.ts")) return next(url, context);
    const file = fileURLToPath(url);
    const js = ts.transpileModule(readFileSync(file, "utf8"), {
      fileName: file, compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
    }).outputText;
    return { format: "module", source: compileModule(js, { filename: file }).js.code, shortCircuit: true };
  },
});
