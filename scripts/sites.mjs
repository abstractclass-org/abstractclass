// The game sites: each folder of `apps/` with a `package.json`. The hub (`apps/hub`) is a site too, but it has no
// build and no package (design 26), so it is not one of them. Each check that reads the game sites takes this list.
// Tests: node --test "scripts/*.test.mjs"
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The game sites of the repository at `root`, in the order of their folders: each with its folder's name (`folder`)
 *  and its package's name (`name`, from its package.json). */
export function gameSites(root) {
  const apps = join(root, "apps");
  return readdirSync(apps, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(apps, entry.name, "package.json")))
    .map(entry => entry.name).sort()
    .map(folder => ({ folder, name: JSON.parse(readFileSync(join(apps, folder, "package.json"), "utf8")).name }));
}
