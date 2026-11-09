# What the site measures, and the decisions it serves

**Status:** in force, and built. **Decided:** 2026-10-13. **Changed:** 2026-11-09 (PostHog in place of Google
Analytics).

## Context

The early access has two analytics services (design 11). Cloudflare Web Analytics counts visits, pages, referrers,
countries, browsers and devices, and the pages' speed (Core Web Vitals). It takes no events of the site's own. The
second service, Google Analytics 4 then (PostHog since 2026-11-09), counted page views only. Neither said whether a
visitor imports a game, finishes a review, or waits too long for it, and the backlog has decisions that wait on those
numbers: the engine's defaults from the speed of visitors' machines, and the GPU on other machines.

## Decision

1. **Events to PostHog, one for each decision** (`track` in `src/lib/analytics.svelte.ts`), with their parameters
   as event properties. Cloudflare's service stays as it is: it takes no events.
2. **Counts and ranges only** (`packages/site/src/measure.ts`): never a game, a move, a player's name, or a game's id. A
   count that could set a visitor apart, or would scatter a report, goes as a range: a game's edges (1-29, 30-59, 60-89,
   90-119, 120+), the machine's cores (1-2, 3-4, 5-8, 9-16, 17+), a review's minutes (0, 1-2, 3-9, 10-29, 30-59,
   60-119, 120-239, 240+: a review at the deepest custom depth, 16,384 visits, takes hours), a share link's
   characters (0-499, 500-999, 1000-1999, 2000-3999, 4000+), the games kept (0, 1, 2-4, 5-9, 10-24, 25+), a practice
   game's takebacks (0, 1, 2-4, 5+), and the practice bot's average seconds a turn (0, 1-2, 3-9, 10-29, 30+: 0 is
   under a second).
3. **The game's id leaves the review's address for the `#`:** `/review#game=ID`. PostHog records a page's query
   (`?game=`). It records what follows the `#` too, unless the site turns that off, as it does
   (`disable_capture_url_hashes` in `packages/site/src/posthog.ts`). Cloudflare's service records neither, so no page
   view carries a game's id. An older address's `?game=ID` moves
   after the `#` before the analytics start. Another game named after the `#` while the page shows one reloads the
   page.
4. **A feature counts once in each review** (`trackOnce`): its first use, not each use, so that a player who draws 40
   notes counts as one player who drew notes. In Practice, once in each game.
5. **The privacy page names the kinds of events,** not each event, as counts and ranges (item 2). A visitor needs
   to know what goes to PostHog, not how each event works. PostHog links the events of one browser for one day only,
   by a hash on its servers (design 11).
6. **The owner's own visits are internal traffic** (`src/lib/internalTraffic.ts`). Any page opened with `?internal=on`
   keeps a flag in the browser, and `?internal=off` removes it. The page then takes the parameter out of its address.
   While the flag is set, every event of that browser carries the property `internal` = `true`, from the first page
   view on. The project's filter of internal and test users drops these events ("The setup in PostHog", below).

### The words

The events use the site's words (design 22), each for one thing:

- **Import:** a game from outside Hedge School, its moves alone, by a paste, another site's link or a tool on meaf.us
  or strategyjam.org (the bookmarklet, the userscript), to the review or to the Analysis board. One event,
  `import_game`, counts every import, with where it went (`import_to`) and how it came (`import_source`).
- **Load:** Hedge School's own saved work, a review or an analysis, from a file, a share link or a partner site. One
  event, `load_saved`, counts every load, with how it came (`load_source`). The source also says where it went: a
  review file, a review's share link and a partner's review go to the review, the others to the Analysis board.
- **Source:** one way in, named whole: `pasted_record`, not `record` (a pasted record and another site's record link
  both carry a record). A tool on each site is a way in of its own: `bookmarklet` and `userscript` on meaf.us, as
  before strategyjam.org, and `strategyjam_bookmarklet` and `strategyjam_userscript` on strategyjam.org. The tool
  names its site with each game (design 11), and one that names none ran on meaf.us. So the reports tell when the
  players leave meaf.us.
- **Export kind:** what an export made, named by its product: `review_file` and `analysis_file`, not `file`.

### The events

| Event | When | Parameters | The decision it serves |
|---|---|---|---|
| `import_game` | a game imported from outside Hedge School, to the review (kept, then reviewed) or to the Analysis board | `import_to` (review, analysis), `import_source` (pasted_record, pasted_constellation, pasted_position, site_link, bookmarklet, userscript, strategyjam_bookmarklet, strategyjam_userscript, older_tool), `edges` | which ways in to keep and improve, and the funnel's second step |
| `import_failed` | an import refused | `import_to`, `import_source`, `import_failure` (record: not read, rejected: the rules or the storage refused it, link: broken) | what breaks imports |
| `load_saved` | saved work loaded: a review or an analysis, from a file, a share link or a partner site | `load_source` (review_file, analysis_file, review_share_link, analysis_share_link, partner_review), `edges` (its game's), `with_results` (a review file, a partner's review), `with_branches` (a review's share link) | which saved work comes back, and the funnel's second step |
| `load_failed` | a load refused | `load_source`, `load_failure` (file, link: not read, rejected: the rules or the storage refused its game) | what breaks loads |
| `tool_out_of_date` | the import page or the review asks to update a tool (Arrival) | `stale_tool` (bookmarklet, userscript, older) | how many players still need the new tools, and, on the review, when `/review#tool=` can go (design 22) |
| `review_share_open` | a review's share link opened, before its load | `network_found`, `same_engine` | whether shared reviews arrive whole |
| `game_missing` | a review's address in a browser without the game | none | whether players send review addresses, which do not work in another browser |
| `review_open` | the review starts, with the engine loaded, or a review snapshot opens (design 20) | `network`, `depth`, `depth_on_screen`, `time_limit`, `workers`, `gpu_mode`, `cores`, `edges`, `own_settings`, `done_before`, `practice_game` (a game against the practice bot) | the funnel's second step, and the settings in use |
| `analysis_open` | the Analysis board opens, with the engine's rules (design 21). A line brought with it is an `import_game` or a `load_saved` too | `edges` (the main line's) | how many players use the board |
| `openings_open` | Openings opens (design 32), with the engine's rules | `openings_from` (page: its own address, from the header's tab or a bookmark; review, analysis: "Study in Openings" in the book's table there; link: another link with a record) | how many players study the book, and from where: whether the table's way in is used, and the first view is worth its work |
| `openings_positions` | in a visit to Openings, the positions looked at reach 5, 10, 25 or 50: one event at each | `positions` (5-9, 10-24, 25-49, 50+) | whether players study past the first view, and so which part of Openings to improve first: the first view, or the tree |
| `editor_open` | the board editor opens (design 21) | none | whether players set up positions |
| `editor_analyze` | the board editor's Analyze: a position that a game can reach goes to the Analysis board | none | whether an editor's position reaches the board |
| `review_done` | the review ends, in this visit (a review that opened done, `done_before`, sends none) | as `review_open`, and `review_seconds` (a number), `minutes`, `worker_speed` (a CPU worker's visits a second, by 5), `gpu_used` | the engine's defaults: how long a review takes on real machines, by settings and cores |
| `gpu_test` | Auto's first test of a GPU | `gpu_outcome` (faster, slower), `gpu_ratio` (the GPU's speed over a worker's), `gpu` (maker and kind, as WebGPU gives them), `network` | the GPU's default, and whether it pays off on laptops and phones |
| `engine_error` | the engine fails | `error_kind` (load, rules, gpu, practice: the bot failed to start, or stopped) | reliability |
| `setting_change` | an engine setting changes | `setting`, `setting_value`, `setting_scope` (browser, game) | whether the defaults fit |
| `feature` | a feature's first use in a review, or on the Analysis board or in Openings in a visit | `feature_name` (the feature, below) | what to keep, to improve, or to explain |
| `export` | an export, from the review or the Analysis board (the page's address tells which) | `export_kind` (share_link, review_file, analysis_file, record_copy, record_file, partner_save: the review file saved to a partner site, design 18), `link_length`, `link_too_long` | whether players share, and whether links fit a Discord message |
| `game_delete`, `game_delete_cancel` | a game deleted after its question (design 11), or the question answered with Cancel, Escape or a click outside it. A click outside or on Cancel within 500 ms of the question's opening, the second click of a double click, counts as neither | none | how often players delete games, and how often the question stops a delete |
| `practice_start` | a practice game starts (design 24), once the bot has the game: a new one, one from the Analysis board's Play, or one kept from an earlier visit | `practice_from` (new, analysis_board, set_up_start: the Analysis board's Play from a set-up start, resumed), `network`, `bot_visits`, `bot_variety` (low, medium, high), `practice_side` (blue, red), `bot_form` (gpu, cpu, single), `cores` | which settings players choose: the defaults, then the levels; and whether the bot starts on their machines, in which form |
| `practice_end` | a practice game ends: by the rules, by Resign, or by Abort | as `practice_start` but `practice_from`, and `practice_outcome` (won, lost, draw, resigned, aborted: the player's), `edges`, `practice_takebacks`, `bot_seconds` (the bot's average seconds a turn, as a range; none before its first turn) | the levels: which settings players beat, lose to, or give up on (design 24's games by setting); and whether a number of visits is bearable on a machine |
| `support_open` | the Support Us dialog opens: Ko-fi's tip panel (design 22) | none | whether visitors open it. The tips are counted on Ko-fi: its panel is Ko-fi's page, which the site cannot see into |

The features, by their `feature_name` (`ReviewView.svelte`, `used`). Each counts once in a review, at its first use:

| `feature_name` | The use |
|---|---|
| `candidate played` | a candidate of the engine played, from the Analysis table or by a double click on the board |
| `listed line played` | an edge of the listed line under the Analysis table played |
| `engine line played` | an edge of the engine's line played |
| `own edge played` | an edge drawn on the board by the player |
| `note drawn` | a note drawn on the board |
| `quality evaluated` | "Evaluate quality" chosen in a move's menu (a variation's, or any on the Analysis board) |
| `main line made` | "Make main line" chosen on the Analysis board (design 21) |
| `branch promoted` | a variation promoted in its menu |
| `branch deleted` | a variation deleted |
| `image copied`, `image saved` | "Copy static" or "Save static" chosen in a move's menu ("Generate image"), or the note's "Save image" (design 07, item 17) |
| `animated image saved` | "Save animated" chosen in a move's menu ("Generate image", design 07, item 17) |
| `keys list` | the list of keys opened (`?`) |
| `threat shown` | the threat shown, by its switch in the engine header or the key x (design 31) |
| `chart jump` | a click on the Advantage or the Difficulty chart, to go to a position |
| `chart advantage`, `chart difficulty` | the chart's tab chosen |
| `book opening row`, `book trap row` | a click on the Report's opening row or on a trap's row, which goes to the position and turns the book on (design 32, item 4) |
| `book shown` | the book's table turned on by its switch or the key o, in the review or on the Analysis board: where the book opens (design 32, item 3) |
| `book move played`, `book refutation played` | a row of the book's table played, or a trap with its refutation ("Play the refutation"): in the review, on the Analysis board and in Openings |
| `fold opened`, `back to main line` | in Openings, a fold of the move list's book tree opened, or "Back to the main line" (design 32, item 5) |
| `snapshot opened` | a review by an earlier engine opened as it was (design 20) |
| `review again` | Review again chosen on a review snapshot |
| `display` and a setting | a display setting changed, by its name in `src/lib/review/display.ts`: `display judge`, `display reviewFor`, `display win`, `display layers`, `display scoreLine`, `display areaLine`, `display lineSteps`, `display branchForm`, `display marks`, `display bookMoves`, `display notes`, `display previewMoves`, `display previewBranches`, `display sound`, `display moveSound`, `display volume` |

In Practice (design 24), each once in a game: `practice komi` (a game that starts with a komi), `practice takeback`
(a takeback), `practice look back` (a step back to an earlier position), `note drawn`, `practice bar`, `practice area`
and `practice direction` (the points bar's display settings), and `display` and a setting for the review's display
settings that Practice shares (`display layers`, `display sound`, `display moveSound`, `display volume`). The page's
address tells Practice's from the review's.

A property of the visitor, `games_stored`, comes with every later event of the page after the Review tab sets it: how
many games the browser keeps, as a range. It is a PostHog super property (`register`), which cookieless mode keeps in
the page's memory. It is not a person property: the site makes no person profiles (`person_profiles: 'never'`), as
PostHog advises for cookieless mode.

## Using it

### The setup in PostHog

PostHog keeps every property of every event, and its insights can filter and break down by any of them with no step
to register them. So the site's events need no setup in PostHog. The project's settings, once
(`https://us.posthog.com/settings/project`):

- **Cookieless tracking:** Settings → Project → Web analytics → **Enable cookieless tracking**, on. Without it,
  PostHog drops the events of the sites' cookieless mode.
- **Internal traffic:** Settings → Project → **Filter out internal and test users**: a filter on the event property
  `internal`, so that the events where it is `true` drop out (item 6,
  [posthog.com/docs/data/test-accounts.md](https://posthog.com/docs/data/test-accounts.md)). An insight then takes
  the filter with its switch of the same name.
- **The data's time:** PostHog's free plan keeps a year of data (posthog.com/pricing). A year compares a release with
  the months before it.

PostHog shows the events in **Activity** at once.

### The reports

Six reports answer the questions of the events table. They become PostHog insights, made by PostHog's API in a later
step. Each report below gives what it shows. Each row of a report's table is one insight: its kind (a **Trends**
insight counts events or visitors, a **Funnel** follows visitors through steps), its events, its breakdown and its
filter. **Visitors** counts PostHog's daily hash: one visitor for each browser and day (design 11).

#### 1. Funnel: where do players drop off?

The funnel shows where players stop, from the Review tab to the review's export. It follows the review only: its
second step takes the imports and the loads to the review, and its export step the exports there. A game imported or
loaded to the review counts on the review's page (`/review`), and one to the board on the board's. A game from
outside, a tool's or another site's link, counts on the import page (`/import`), where it arrives.

| Step | Name | Condition |
|---|---|---|
| 1 | Review tab | `$pageview` with `$pathname` = `/review` |
| 2 | Game in | `import_game` or `load_saved`, with `$pathname` = `/review` or `/import` |
| 3 | Review open | `review_open` |
| 4 | Review done | `review_done` |
| 5 | Export | `export`, with `$pathname` = `/review` |

| Insight | Kind | Steps | Breakdown |
|---|---|---|---|
| From the visit | Funnel | 1 to 5 | none |
| By way in | Funnel | 2 to 5 | `import_source` |
| By load | Funnel | 2 to 5 | `load_source` |

A player who opens a game kept from an earlier visit has no import, so the funnel shows players' first reviews best.
The daily hash ends a visitor's funnel when the day changes, so a review that runs past it counts as a drop.

#### 2. Engine defaults: are they right?

How long reviews take, by their settings and by the visitors' machines.

| Insight | Kind | Events | Value | Breakdown |
|---|---|---|---|---|
| Time by settings | Trends | `review_done` | the average of `review_seconds` | `depth`, `network`, `cores` |
| Minutes | Trends | `review_done` | count | `minutes`, `depth` |
| Machines | Trends | `review_done` | the average of `worker_speed`, and the count | `cores` |
| Started and ended | Trends | `review_open`, `review_done` | count | `depth` |

At a depth with many starts and few ends, players do not wait for the review. That depth is too deep for a default.
The machines' speeds size the pool of workers.

#### 3. GPU: does it pay off?

Whether the GPU is faster than a worker, for each kind of GPU.

| Insight | Kind | Events | Value | Breakdown |
|---|---|---|---|---|
| GPU tests | Trends | `gpu_test` | count, and the average of `gpu_ratio` | `gpu`, `gpu_outcome` |

#### 4. Features: which earn their place?

How many players use each feature, against how many players open a review. `$pathname` tells the review's features
(`/review`) from the Analysis board's (`/analysis`).

| Insight | Kind | Events | Value | Breakdown |
|---|---|---|---|---|
| Feature users | Trends | `feature` | visitors | `feature_name`, `$pathname` |
| Review users | Trends | `review_open` | visitors | none |
| Board users | Trends | `analysis_open` | visitors | none |
| Editor users | Trends | `editor_open`, `editor_analyze` | visitors | none |

#### 5. Settings: do the defaults fit?

Which engine settings players change, and to what, on the review's page and on the Analysis board. A setting that most
players change away from its default asks for another default.

| Insight | Kind | Events | Value | Breakdown |
|---|---|---|---|---|
| Changes | Trends | `setting_change` | count, and visitors | `setting`, `setting_value`, `$pathname` |

#### 6. Imports and exports: do they work?

How games come in, to the review and to the Analysis board, what fails, and what goes out.

| Insight | Kind | Events | Value | Breakdown |
|---|---|---|---|---|
| Ways in | Trends | `import_game` | count, and visitors | `import_source`, `import_to` |
| Failed imports | Trends | `import_failed` | count | `import_source`, `import_failure`, `import_to` |
| Loads | Trends | `load_saved` | count, and visitors | `load_source` |
| Failed loads | Trends | `load_failed` | count | `load_source`, `load_failure` |
| Share links | Trends | `review_share_open` | count | `network_found`, `same_engine` |
| Old tools | Trends | `tool_out_of_date` | count | `stale_tool`, `$pathname` |
| Missing games | Trends | `game_missing` | count | none |
| Exports | Trends | `export` | count, and visitors | `export_kind`, `$pathname` |

Each site's events carry its host (`$host`): a breakdown or a filter on it parts Hedge School's events from
Cyanotype's.

### Reading it

- **Few players, so signals, not proof.** The early access is a Discord's worth of players. A difference between two
  groups of ten says little. Read the numbers beside what players say in the Discord.
- **Releases in order:** the footer names each release's commit. Compare a report's weeks before and after a release.
- **Visitors by the day:** PostHog's hash changes each day, so a visitor who comes back on another day counts again,
  and returns cannot be told from new visitors (design 11).
- **Blockers:** a browser whose blocker stops PostHog's requests is in no count. uBlock Origin's default lists do not
  stop them. AdGuard's tracking protection list and Firefox's strict tracking protection do. The site does not ask
  those visitors to allow it (design 27, withdrawn).
- **Most worth having:** `review_done`'s minutes and speed by machine, which no feedback gives.

## Why

- **One event for each decision,** so that the data answers a question asked before it came, and the site collects
  nothing for its own sake.
- **Ranges,** so that a rare count (a machine of 64 cores, a game of 7 edges) does not set a visitor apart, and the
  reports group well.
- **The game's id after the `#`:** the site's promise is that neither service sees a game. An id made from the moves
  does not show the game, but it ties each page view to one game, and the reports gain nothing from it.
- **A feature once in each review:** the question is how many players use it, not how often.
-  **A flag in the browser for internal traffic:** PostHog's
  [filter of internal and test users](https://posthog.com/docs/data/test-accounts.md) takes any event property, Google's
  [internal traffic article](https://support.google.com/analytics/answer/10104470) let a site add `traffic_type` to its
  events itself, and Plausible (`plausible_ignore`) and Matomo (a cookie that ignores the visits) use a flag in the
  browser too. The flag changes only its own browser's events, so it needs no secret.

## Alternatives

- **The page views alone:** they cannot answer whether a review finishes, or how long it takes.
- **Cloudflare's service for the events:** it takes none.
- **The game's id kept in the query, removed from each page view by hand:** a later change of the client's options
  could send it again, and Cloudflare's service and the server's logs would still see it.
- **Exact numbers for every count:** a scatter of values that groups badly and could set a visitor apart.
- **An IP rule for internal traffic,** Google Analytics' own way: the owner's machine goes through Cloudflare WARP.
  WARP changes its addresses and shares them among its users. So a rule misses the owner's visits, and it can catch
  other people's visits.

## Consequences

- A review's address is `/review#game=ID`. Older addresses keep working.
- A new event or parameter goes into this document, and into the reports that need it. It goes into the
  privacy page only when it is a new kind of event, or when it holds something that the page does not name.
- The owner sets the flag of internal traffic once in each browser, and the project's filter of internal and test
  users once ("The setup in PostHog"). A browser without the flag counts as before.

## Where it is

- `src/lib/analytics.svelte.ts` (`track`, `trackOnce`, `setVisitor`), Hedge School's analytics of
  `packages/site/src/analytics.svelte.ts`. The ranges: `packages/site/src/measure.ts`, tested in `measure.test.ts`
  beside it. PostHog's client: `packages/site/src/posthog.ts`. Cyanotype has the same, with its own keys (design 33,
  "Analytics"). The check in a browser: `tests/analytics.spec.ts`.
- The flag of internal traffic: `src/lib/internalTraffic.ts`, Hedge School's key of
  `packages/site/src/internalTraffic.ts`, tested in `src/lib/internalTraffic.test.ts`. The site reads the address's
  parameter as it starts, in `src/hooks.client.ts`.
- The events: `packages/import/src/importEvents.ts` (the imports and loads), with Hedge School's sources in
  `src/lib/game/sources.ts`, `src/lib/review/ReviewHome.svelte` (the Review tab's imports and loads, deletes,
  `games_stored`), `src/lib/review/Arrival.svelte` (the tools' imports, the share links' and partners' loads),
  `src/routes/analysis/+page.svelte` (the board's imports and loads, `analysis_open`),
  `src/routes/openings/+page.svelte` (`openings_open`, `openings_positions`, Openings' features),
  `src/lib/book/place.svelte.ts` (`book shown`), `src/routes/review/+page.svelte`
  (the review's events, settings, features, `game_missing`, the address), `packages/review/src/ReviewView.svelte`
  (`onfeature`), `trackExport` in `src/lib/game/sources.ts` (`export`, from the Export menu, on
  `packages/review/src/exportEvents.ts`), the settings' changes in `src/lib/analysis/settingChanges.ts` (on
  `packages/analysis/src/settingChanges.ts`),
  `packages/analysis/src/gpu.svelte.ts` (`gpu_test`, the GPU's failure), `workerSpeed` in
  `packages/engine/src/pool.ts`, `src/routes/practice/+page.svelte` (Practice's events and features), with their
  parameters in `src/lib/practice/hedgefund.ts` (`practiceParams`, `practiceEndParams`, on
  `packages/practice/src/practiceEvents.ts`, tested in `practice.test.ts`).
- The privacy page: `src/routes/privacy/+page.svelte`.

## Log entries

- [decisions/product.md](../decisions/product.md): "Events for the decisions that wait on data" (2026-10-13).
- [decisions/product.md](../decisions/product.md): "Links from another site, and reviews saved back" (2026-10-13): the
  import's parameter renamed `import_source`.
- [decisions/product.md](../decisions/product.md): "The explorations in Google Analytics" (2026-10-13).
- [decisions/product.md](../decisions/product.md): "Analytics parameters named by their subject, and the data collection
  settings" (2026-10-14).
- [decisions/product.md](../decisions/product.md): "A question before the practice games' delete, and the cancelled
  deletes counted" (2026-10-17).
- [decisions/product.md](../decisions/product.md): "The owner's visits marked as internal traffic" (2026-10-17).
- [decisions/product.md](../decisions/product.md): "Openings, the book's own page, on the test book" (2026-11-04): the
  book's counts.
- [decisions/product.md](../decisions/product.md): "The review's custom depth up to 16,384 visits" (2026-10-18): the
  review's minutes past 60 in three ranges.
- [decisions/product.md](../decisions/product.md): "The Privacy page says what goes where, in less detail"
  (2026-10-22): the page names the kinds of events, not each event.
- [decisions/product.md](../decisions/product.md): "PostHog in place of Google Analytics" (2026-11-09): the events go
  to PostHog, and the explorations become PostHog insights.
