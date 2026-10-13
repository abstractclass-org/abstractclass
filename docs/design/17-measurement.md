# What the site measures, and the decisions it serves

**Status:** in force, and built. **Decided:** 2026-10-13.

## Context

The early access has two analytics services (design 11). Cloudflare Web Analytics counts visits, pages, referrers,
countries, browsers and devices, and the pages' speed (Core Web Vitals). It takes no events of the site's own. Google
Analytics 4 counted page views only. Neither said whether a visitor imports a game, finishes a review, or waits too
long for it, and the backlog has decisions that wait on those numbers: the engine's defaults from the speed of
visitors' machines, and the GPU on other machines.

## Decision

1. **Events to Google Analytics, one for each decision** (`track` in `src/lib/analytics.svelte.ts`). Cloudflare's
   service stays as it is: it takes no events.
2. **Counts and ranges only** (`src/lib/measure.ts`): never a game, a move, a player's name, or a game's id. A count
   that could set a visitor apart, or would scatter a report, goes as a range: a game's edges (1-29, 30-59, 60-89,
   90-119, 120+), the machine's cores (1-2, 3-4, 5-8, 9-16, 17+), a review's minutes (0, 1-2, 3-9, 10-29, 30-59, 60+),
   a share link's characters (0-499, 500-999, 1000-1999, 2000-3999, 4000+), and the games kept (0, 1, 2-4, 5-9, 10-24,
   25+).
3. **The game's id leaves the review's address for the `#`:** `/review#game=ID`. Google Analytics records a page's
   query (`?game=`) and not what follows the `#`
   ([Google's page path article](https://support.google.com/analytics/answer/13844737)), and Cloudflare's service
   records neither, so no page view carries a game's id. An older address's `?game=ID` moves
   after the `#` before the analytics start. Another game named after the `#` while the page shows one reloads the
   page.
4. **A feature counts once in each review** (`trackOnce`): its first use, not each use, so that a player who draws 40
   notes counts as one player who drew notes.
5. **The privacy page lists every event** in plain words. A visitor who has not accepted the cookies sends the events
   as cookieless pings, which Google counts with nothing that links one to another.

### The events

| Event | When | Parameters | The decision it serves |
|---|---|---|---|
| `import_game` | a game kept, from any way in | `import_source` (record, constellation, review_file, bookmarklet, userscript, older_tool, share_link, site_link, site_review), `edges`, `with_results` (a file), `with_branches` (a link) | which ways in to keep and improve, and the funnel's first step |
| `import_failed` | an import refused | `import_source`, `reason` (record: not read, rejected: the rules or the storage refused it, file, link) | what breaks imports |
| `tool_out_of_date` | the import page asks to update a tool | `tool` (bookmarklet, userscript, older) | how many players still need the new tools |
| `share_open` | a share link's page | `network_found`, `same_engine` | whether shared reviews arrive whole |
| `game_missing` | a review's address in a browser without the game | none | whether players send review addresses, which do not work in another browser |
| `review_open` | the review starts, with the engine loaded | `network`, `depth`, `depth_on_screen`, `time_limit`, `workers`, `gpu_mode`, `cores`, `edges`, `own_settings`, `done_before` | the funnel's second step, and the settings in use |
| `review_done` | the review ends, in this visit | as `review_open`, and `review_seconds` (a number), `minutes`, `worker_speed` (a CPU worker's visits a second, by 5), `gpu_used` | the engine's defaults: how long a review takes on real machines, by settings and cores |
| `gpu_test` | Auto's first test of a GPU | `outcome` (faster, slower), `ratio` (the GPU's speed over a worker's), `gpu` (maker and kind, as WebGPU gives them), `network` | the GPU's default, and whether it pays off on laptops and phones |
| `engine_error` | the engine fails | `kind` (load, rules, gpu) | reliability |
| `setting_change` | an engine setting changes | `setting`, `setting_value`, `scope` (browser, game) | whether the defaults fit |
| `feature` | a feature's first use in a review | `name` (candidate played, listed line played, engine line played, own edge played, note drawn, quality evaluated, branch promoted, branch deleted, keys list, chart difficulty, chart advantage, chart jump, display and a setting's name) | what to keep, to improve, or to explain |
| `export` | an export | `kind` (link, file, copy, text, partner: the review file saved to a partner site, design 18), `link_length`, `too_long` | whether players share, and whether links fit a Discord message |
| `game_delete`, `game_restore` | a game deleted, its Undo | none | whether Undo saves slips |

A property of the visitor, `games_stored`, comes with every event after the home page sets it: how many games the
browser keeps, as a range.

## Using it

### The setup in Google Analytics (once, by the owner)

Google receives every parameter of every event. A report shows a parameter only after it is registered as a custom
dimension or a custom metric, and only for the events that come after the registration. Thus register them soon. The
setup needs the Editor role on the site's property.

**Before you start:** go to [analytics.google.com](https://analytics.google.com). Select the site's property in the
selector at the top left. Click **Admin**, the gear at the bottom left.

#### 1. The custom dimensions (29 rows of the table below)

1. In Admin, under **Data display**, click **Custom definitions**.
2. On the **Custom dimensions** tab, click **Create custom dimension**.
3. Fill in the form from one row of the table below:
   - **Dimension name:** the name in the table. This name shows in the reports. Hyphens are not permitted.
   - **Scope:** the scope in the table. You cannot change it after you save.
   - **Description:** optional. The table's last column can serve.
   - **Event parameter** (for scope User, **User property**): the parameter in the table, exactly as it is written.
     Select it in the list. If the list does not have it yet, type it: the list shows only the parameters that Google
     received.
4. Click **Save**.
5. Do steps 2 to 4 again for each row.

| Event parameter | Dimension name | Scope | What it holds |
|---|---|---|---|
| `import_source` | Import source | Event | how a game came in: record, constellation, review_file, bookmarklet, userscript, older_tool, share_link, site_link, site_review |
| `reason` | Import failure | Event | why an import failed: record, rejected, file, link |
| `edges` | Game edges | Event | the game's edges, as a range |
| `with_results` | File with results | Event | a review file that has the engine's results |
| `with_branches` | Link with branches | Event | a share link that has branches |
| `tool` | Tool out of date | Event | bookmarklet, userscript, older |
| `network_found` | Share network found | Event | the share link's network is on this site |
| `same_engine` | Share same engine | Event | the share link's engine is this site's engine |
| `network` | Engine network | Event | the network's name |
| `depth` | Review depth | Event | the review's visits a move |
| `depth_on_screen` | Depth on screen | Event | the visits for the position on screen |
| `time_limit` | Time limit | Event | the seconds for the position on screen, 0 for none |
| `workers` | Workers | Event | the CPU workers |
| `gpu_mode` | GPU mode | Event | auto, on or off |
| `cores` | CPU cores | Event | the machine's cores, as a range |
| `own_settings` | Game own settings | Event | the game has its own settings, from an imported review |
| `done_before` | Done before | Event | the review opened with its results stored |
| `minutes` | Review minutes | Event | the review's time, as a range |
| `gpu_used` | GPU used | Event | the GPU searched in the review |
| `outcome` | GPU test outcome | Event | faster or slower |
| `gpu` | GPU | Event | the GPU's maker and kind |
| `setting` | Setting | Event | the setting that changed |
| `setting_value` | Setting value | Event | the setting's new value |
| `scope` | Setting scope | Event | browser (this browser's settings) or game (one game's settings) |
| `name` | Feature | Event | the feature used |
| `kind` | Kind | Event | an export's kind (link, file, copy, text, partner), or an engine failure's kind (load, rules, gpu) |
| `link_length` | Link length | Event | a share link's characters, as a range |
| `too_long` | Link too long | Event | the link is longer than a Discord message takes |
| `games_stored` | Games stored | **User** | the games that the browser keeps, as a range |

The property can have 50 event-scoped and 25 user-scoped custom dimensions. These take 28 and 1.

**No parameter is named `source`, `medium` or `campaign`.** Google Analytics keeps a visit's traffic source in event
parameters of those names, so it reads the site's own parameter as the session's source. With the import's way in
named `source`, the Traffic acquisition report gave sessions the source "userscript" in place of the site that the
visitor came from. The parameter is therefore `import_source`. If the property still has the dimension Import source
on `source`, archive it (its row's **⋮** menu, then **Archive**), and create the row above.

#### 2. The custom metrics (3)

1. In **Custom definitions**, click the **Custom metrics** tab, then **Create custom metric**.
2. Fill in the form, click **Save**, and do it again for each row:

| Event parameter | Metric name | Scope | Unit of measurement |
|---|---|---|---|
| `review_seconds` | Review seconds | Event | Time, then Seconds |
| `worker_speed` | Worker speed | Event | Standard |
| `ratio` | GPU speed ratio | Event | Standard |

#### 3. The key events (3)

1. In Admin, under **Data display**, click **Events**.
2. Find `import_game`, `review_done` and `export`. Click the star beside each one.
3. If an event is not in the list yet, either wait or create it. The list shows an event only some hours after Google
   receives it first, and only after a visitor does it on the live site. To create it, click **+ Create event** on the
   same page:
   1. Type the event's name exactly (`import_game`), and turn on **Mark as key event**.
   2. **Default key event value:** do not set one. **Counting method:** once per event.
   3. Click **Create**.

   If the form asks for **matching conditions**, it makes a new event from other events, and the site's events would
   then count twice. In that case, cancel it, and wait for the events to show in the list.

#### 4. The data retention

1. In Admin, under **Data collection and modification**, click **Data retention**.
2. Set **Event data retention** to **14 months**, and click **Save**. The default, 2 months, is too short to compare a
   release with the months before it.

#### After the setup

Google shows the events in **Reports → Realtime** at once. The custom dimensions fill the reports within a day or two,
from the time of their registration on.

### The questions, and the reports that answer them

- **Where do players drop off?** Explore → Funnel exploration, with the steps: a page view of the home or import page,
  `import_game`, `review_open`, `review_done`, `export`. Break it down by `import_source`.
- **Are the engine's defaults right?** Explore → Free form: `review_done`, rows `depth` and `network`, columns `cores`,
  values the average of `review_seconds` and the event count, and the distribution of `minutes`. A default is too deep
  when most reviews at it take longer than players wait (see whether `review_open` without a `review_done` grows with
  `minutes`). `worker_speed` by `cores` gives the visitors' machines in visits a second, for the pool's size.
- **Does the GPU pay off?** `gpu_test`, rows `gpu`, columns `outcome`, values the average `ratio`.
- **Which features earn their place?** `feature`, rows `name`, value the count of users, against `review_open`'s users.
- **Do the defaults fit?** `setting_change`, rows `setting` and `setting_value`: a setting that most players change away from
  its default asks for another default.
- **Do shares and imports work?** `share_open` by `network_found`, `import_failed` by `import_source` and `reason`,
  `tool_out_of_date` by `tool`, `game_missing`.

### Reading it

- **Few players, so signals, not proof.** The early access is a Discord's worth of players. A difference between two
  groups of ten says little. Read the numbers beside what players say in the Discord.
- **Releases in order:** the footer names each release's commit. Compare a report's weeks before and after a release.
- **Consent:** the counts include every visitor, but users, sessions and returns count only those who accepted
  (design 11).
- **Most worth having:** `review_done`'s minutes and speed by machine, which no feedback gives.

## Why

- **One event for each decision,** so that the data answers a question asked before it came, and the site collects
  nothing for its own sake.
- **Ranges,** so that a rare count (a machine of 64 cores, a game of 7 edges) does not set a visitor apart, and the
  reports group well.
- **The game's id after the `#`:** the site's promise is that neither service sees a game. An id made from the moves
  does not show the game, but it ties each page view to one game, and the reports gain nothing from it.
- **A feature once in each review:** the question is how many players use it, not how often.

## Alternatives

- **The page views alone:** they cannot answer whether a review finishes, or how long it takes.
- **Cloudflare's service for the events:** it takes none.
- **The game's id kept in the query, removed from each page view by hand** (Google's `page_location`, with its own
  page views off): it depends on a setting in Google's console that a later change could turn on again, and Cloudflare's
  service and the server's logs would still see it.
- **Exact numbers for every count:** a scatter of values that groups badly and could set a visitor apart.

## Consequences

- A review's address is `/review#game=ID`. Older addresses keep working.
- The owner registers the parameters in Google Analytics once (above). Until then the events show in Realtime only.
- A new event or parameter goes into this document, the privacy page and Google's custom definitions together.

## Where it is

- `src/lib/analytics.svelte.ts` (`track`, `trackOnce`, `setVisitor`), `src/lib/measure.ts` (the ranges, tested in
  `src/lib/measure.test.ts`).
- The events: `src/routes/+page.svelte` (imports, deletes, `games_stored`), `src/routes/import/+page.svelte` (the tools'
  and share links' imports), `src/routes/review/+page.svelte` (the review's events, settings, features, `game_missing`,
  the address), `src/lib/review/ReviewView.svelte` (`onfeature`), `src/lib/ExportMenu.svelte` (`export`),
  `src/lib/analysis/gpu.svelte.ts` (`gpu_test`, the GPU's failure), `workerSpeed` in `src/lib/analysis/pool.ts`.
- The privacy page: `src/routes/privacy/+page.svelte`.

## Log entries

- [decisions/product.md](../decisions/product.md): "Events for the decisions that wait on data" (2026-10-13).
- [decisions/product.md](../decisions/product.md): "Links from another site, and reviews saved back" (2026-10-13): the
  import's parameter renamed `import_source`.
