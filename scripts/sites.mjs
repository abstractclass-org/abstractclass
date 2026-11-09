// The repository's sites: each folder of `apps/` with a `package.json`. The hub's folder has none, so it is not a
// site. The checks that read the sites take this one list: scripts/engine-kinds.mjs and scripts/package-imports.mjs.
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The sites of the repository at `root`, in the order of their folders: each with its folder's name (`folder`), its
 *  folder's path (`path`) and its package's name (`name`, from its package.json; undefined when it gives none). */
export function sites(root) {
  const apps = join(root, "apps");
  return readdirSync(apps, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(apps, entry.name, "package.json")))
    .map(entry => entry.name).sort()
    .map(folder => {
      const path = join(apps, folder);
      return { folder, path, name: JSON.parse(readFileSync(join(path, "package.json"), "utf8")).name };
    });
}
