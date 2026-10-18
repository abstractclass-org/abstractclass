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
   90-119, 120+), the machine's cores (1-2, 3-4, 5-8, 9-16, 17+), a review's minutes (0, 1-2, 3-9, 10-29, 30-59,
   60-119, 120-239, 240+: a review at the deepest custom depth, 16,384 visits, takes hours), a share link's
   characters (0-499, 500-999, 1000-1999, 2000-3999, 4000+), the games kept (0, 1, 2-4, 5-9, 10-24, 25+), a practice
   game's takebacks (0, 1, 2-4, 5+), and the practice bot's average seconds a turn (0, 1-2, 3-9, 10-29, 30+: 0 is
   under a second).
3. **The game's id leaves the review's address for the `#`:** `/review#game=ID`. Google Analytics records a page's
   query (`?game=`) and not what follows the `#`
   ([Google's page path article](https://support.google.com/analytics/answer/13844737)), and Cloudflare's service
   records neither, so no page view carries a game's id. An older address's `?game=ID` moves
   after the `#` before the analytics start. Another game named after the `#` while the page shows one reloads the
   page.
4. **A feature counts once in each review** (`trackOnce`): its first use, not each use, so that a player who draws 40
   notes counts as one player who drew notes. In Practice, once in each game.
5. **The privacy page lists every event** in plain words. A visitor who has not accepted the cookies sends the events
   as cookieless pings, which Google counts with nothing that links one to another.
6. **The owner's own visits are internal traffic** (`src/lib/internalTraffic.ts`). Any page opened with `?internal=on`
   keeps a flag in the browser, and `?internal=off` removes it. The page then takes the parameter out of its address.
   While the flag is set, every event of that browser carries `traffic_type` = `internal`, from the first page view on.
   The property's **Internal Traffic** filter drops these events. The steps in Google Analytics are in
   [hosting.md](../hosting.md), section 4.

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
| `import_forwarded` | a link that used the old address, `/import`, forwarded to the review (design 22) | `import_source`, or `load_source` for a partner's review | when the forwarding can stop |
| `tool_out_of_date` | the review asks to update a tool (Arrival) | `stale_tool` (bookmarklet, userscript, older) | how many players still need the new tools |
| `review_share_open` | a review's share link opened, before its load | `network_found`, `same_engine` | whether shared reviews arrive whole |
| `game_missing` | a review's address in a browser without the game | none | whether players send review addresses, which do not work in another browser |
| `review_open` | the review starts, with the engine loaded, or a snapshot opens (design 20) | `network`, `depth`, `depth_on_screen`, `time_limit`, `workers`, `gpu_mode`, `cores`, `edges`, `own_settings`, `done_before`, `practice_game` (a game against the practice bot) | the funnel's second step, and the settings in use |
| `analysis_open` | the Analysis board opens, with the engine's rules (design 21). A line brought with it is an `import_game` or a `load_saved` too | `edges` (the main line's) | how many players use the board |
| `editor_open` | the board editor opens (design 21) | none | whether players set up positions |
| `editor_analyze` | the board editor's Analyze: a position that a game can reach goes to the Analysis board | none | whether an editor's position reaches the board |
| `review_done` | the review ends, in this visit | as `review_open`, and `review_seconds` (a number), `minutes`, `worker_speed` (a CPU worker's visits a second, by 5), `gpu_used` | the engine's defaults: how long a review takes on real machines, by settings and cores |
| `gpu_test` | Auto's first test of a GPU | `gpu_outcome` (faster, slower), `gpu_ratio` (the GPU's speed over a worker's), `gpu` (maker and kind, as WebGPU gives them), `network` | the GPU's default, and whether it pays off on laptops and phones |
| `engine_error` | the engine fails | `error_kind` (load, rules, gpu, practice: the bot failed to start, or stopped) | reliability |
| `setting_change` | an engine setting changes | `setting`, `setting_value`, `setting_scope` (browser, game) | whether the defaults fit |
| `feature` | a feature's first use in a review, or on the Analysis board in a visit | `feature_name` (the feature, below) | what to keep, to improve, or to explain |
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
| `quality evaluated` | "Evaluate quality" chosen in a move's menu (a branch's, or any on the Analysis board) |
| `main line made` | "Make main line" chosen on the Analysis board (design 21) |
| `branch promoted` | a branch promoted in its menu |
| `branch deleted` | a branch deleted |
| `keys list` | the list of keys opened (`?`) |
| `chart jump` | a click on the Advantage or the Difficulty chart, to go to a position |
| `chart advantage`, `chart difficulty` | the chart's tab chosen |
| `snapshot opened` | a review by an earlier engine opened as it was (design 20) |
| `review again` | Review again chosen on a snapshot |
| `display` and a setting | a display setting changed, by its name in `src/lib/review/display.ts`: `display judge`, `display reviewFor`, `display win`, `display layers`, `display scoreLine`, `display areaLine`, `display lineSteps`, `display branchForm`, `display marks`, `display notes`, `display previewMoves`, `display previewBranches`, `display sound`, `display moveSound`, `display volume` |

In Practice (design 24), each once in a game: `practice takeback` (a takeback), `practice look back` (a step back to an
earlier position), `note drawn`, `practice bar`, `practice area` and `practice direction` (the points bar's display
settings), and `display` and a setting for the review's display settings that Practice shares (`display layers`,
`display sound`, `display moveSound`, `display volume`). The page's address tells Practice's from the review's.

A property of the visitor, `games_stored`, comes with every event after the home page sets it: how many games the
browser keeps, as a range.

## Using it

### The setup in Google Analytics (once, by the owner)

Google receives every parameter of every event. A report shows a parameter only after it is registered as a custom
dimension or a custom metric, and only for the events that come after the registration. Thus register them soon. The
setup needs the Editor role on the site's property.

**Before you start:** go to [analytics.google.com](https://analytics.google.com). Select the site's property in the
selector at the top left. Click **Admin**, the gear at the bottom left.

#### 1. The custom dimensions (41 rows of the table below)

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
| `import_to` | Import destination | Event | where an imported game went: review, analysis |
| `import_source` | Import source | Event | how a game came in from outside: pasted_record, pasted_constellation, pasted_position, site_link, bookmarklet, userscript, strategyjam_bookmarklet, strategyjam_userscript, older_tool |
| `import_failure` | Import failure | Event | why an import failed: record, rejected, link |
| `load_source` | Load source | Event | how saved work came in, and so where it went: review_file, analysis_file, review_share_link, analysis_share_link, partner_review |
| `load_failure` | Load failure | Event | why a load failed: file, link, rejected |
| `edges` | Game edges | Event | the game's edges, as a range |
| `with_results` | File with results | Event | a loaded review file, or a partner's review, that has the engine's results |
| `with_branches` | Link with branches | Event | a review's share link that has branches |
| `stale_tool` | Tool out of date | Event | bookmarklet, userscript, older |
| `network_found` | Share network found | Event | a review's share link: its network is on this site |
| `same_engine` | Share same engine | Event | a review's share link: its engine searches as this site's (request 17) |
| `network` | Engine network | Event | the network's name, as the engine's release names it: HedgeFund 0.2 Lite. Before HedgeFund 0.2, the events gave the network's size alone: b10c128 for HedgeFund 0.1 Lite, b15c192 for HedgeFund 0.1 |
| `depth` | Review depth | Event | the review's visits a move |
| `depth_on_screen` | Depth on screen | Event | the visits for the position on screen |
| `time_limit` | Time limit | Event | the seconds for the position on screen, 0 for none |
| `workers` | Workers | Event | the CPU workers |
| `gpu_mode` | GPU mode | Event | auto, on or off |
| `cores` | CPU cores | Event | the machine's cores, as a range |
| `own_settings` | Game own settings | Event | the game has its own settings: from a loaded review, or from its last review when that review's network has left the menus (design 09) |
| `done_before` | Done before | Event | the review opened with its results stored, or as a snapshot |
| `minutes` | Review minutes | Event | the review's time, as a range |
| `gpu_used` | GPU used | Event | the GPU searched in the review |
| `gpu_outcome` | GPU test outcome | Event | faster or slower |
| `gpu` | GPU | Event | the GPU's maker and kind |
| `setting` | Setting | Event | the setting that changed |
| `setting_value` | Setting value | Event | the setting's new value: the network by its name, as `network` gives it |
| `setting_scope` | Setting scope | Event | browser (this browser's settings) or game (one game's settings) |
| `feature_name` | Feature | Event | the feature used |
| `export_kind` | Export kind | Event | what an export made: share_link, review_file, analysis_file, record_copy, record_file, partner_save |
| `error_kind` | Error kind | Event | an engine failure's kind: load, rules, gpu, practice |
| `link_length` | Link length | Event | a share link's characters, as a range |
| `link_too_long` | Link too long | Event | the link is longer than a Discord message takes |
| `practice_from` | Practice from | Event | how a practice game started: new, analysis_board, set_up_start, resumed |
| `bot_visits` | Bot visits | Event | the practice bot's visits a move |
| `bot_variety` | Bot variety | Event | the practice bot's variety: low, medium, high |
| `practice_side` | Practice side | Event | the player's side in a practice game: blue, red |
| `bot_form` | Bot form | Event | where the practice bot ran: gpu, cpu, single |
| `practice_outcome` | Practice outcome | Event | how a practice game ended, for the player: won, lost, draw, resigned, aborted |
| `practice_takebacks` | Practice takebacks | Event | a practice game's takebacks, as a range |
| `bot_seconds` | Bot seconds | Event | the practice bot's average seconds a turn in a game, as a range |
| `practice_game` | Practice game | Event | the review is of a game against the practice bot |
| `games_stored` | Games stored | **User** | the games that the browser keeps, as a range |

The property can have 50 event-scoped and 25 user-scoped custom dimensions. These take 41 and 1.

**No parameter is named `source`, `medium` or `campaign`.** Google Analytics keeps a visit's traffic source in event
parameters of those names, so it reads the site's own parameter as the session's source. With the import's way in
named `source`, the Traffic acquisition report gave sessions the source "userscript" in place of the site that the
visitor came from. The parameter is therefore `import_source`.

**A parameter's name names its subject** (`export_kind`, not `kind`). A custom dimension takes its parameter from every
event that sends it, so a generic name, reused by a later event, would gather values of different meanings in one
report. The earlier names were `kind` (for an export and for an engine failure both), `name`, `reason`, `scope`,
`outcome`, `tool`, `too_long`, the metric `ratio`, and `source`. If the property still has a definition on one of them,
archive it (its row's **⋮** menu, then **Archive**), and create its row above. An archived name can be used again, and
an exploration that used an archived dimension needs the new one in its **Variables** and its tab.

#### 2. The custom metrics (3)

1. In **Custom definitions**, click the **Custom metrics** tab, then **Create custom metric**.
2. Fill in the form, click **Save**, and do it again for each row:

| Event parameter | Metric name | Scope | Unit of measurement |
|---|---|---|---|
| `review_seconds` | Review seconds | Event | Time, then Seconds |
| `worker_speed` | Worker speed | Event | Standard |
| `gpu_ratio` | GPU speed ratio | Event | Standard |

#### 3. The key events (4)

1. In Admin, under **Data display**, click **Events**.
2. Find `import_game`, `load_saved`, `review_done` and `export`. Click the star beside each one.
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

#### 5. The calculated metrics (3)

Three questions need an average of a number that an event carries, and Explore gives only totals. A calculated metric
divides a total by the count of events.

1. In **Custom definitions**, click the **Calculated metrics** tab, then **Create calculated metric**.
2. Fill in the form, click **Save**, and do it again for each row:
   - **Name** and **API name:** as in the table. The API name field starts with `calcMetric:`. Type after it.
   - **Formula:** type `{` and the start of a metric's name, then click the metric in the list. Type ` / ` between
     the two metrics.
   - **Unit of measurement:** as in the table.

| Name | API name | Formula | Unit of measurement |
|---|---|---|---|
| Average review seconds | `average_review_seconds` | `{Review seconds} / {Event count}` | Time, then Seconds |
| Average worker speed | `average_worker_speed` | `{Worker speed} / {Event count}` | Standard |
| Average GPU speed ratio | `average_gpu_ratio` | `{GPU speed ratio} / {Event count}` | Standard |

An average is right only in an exploration whose filter keeps the one event that carries its number (`review_done`, or
`gpu_test` for the ratio). Otherwise the count of events includes other events. The property can have 5 calculated
metrics. These take 3.

#### 6. The explorations (6)

An exploration is a report that Google keeps under **Explore**. An exploration has one or more tabs. Each tab has its
own settings: its technique, its rows or steps, its columns, its values and its filter. A filter set on one tab does
not apply to the other tabs. The property has the six explorations below: this section says how they are made, to
check them or to make them again.

Below, each exploration gives the dimensions and metrics to add to its **Variables** column, then a table with
one row for each tab. A row gives all the settings of its tab. "None" means: leave that setting empty.

**To make an exploration:**

1. In the left menu, click **Explore**, then **Blank**. The exploration opens with one tab, **Free form 1**, and the
   date range **Last 28 days** (to yesterday).
2. In the **Variables** column, click the name **Untitled exploration**, select its text, type the exploration's
   name, and press Enter.
3. Click **+** beside **Dimensions**. In the search box, type a dimension's name, and select its box. Do this for
   each dimension in the exploration's **Variables** line, then click **Confirm**. Click **+** beside **Metrics**,
   and do the same for its metrics.
4. Set the tabs, from the first row of the table to the last.

**To set a tab of the technique Free form:**

1. For the first tab, use **Free form 1**. For each next tab, click **+** to the right of the tab names, and click
   **Free form** in the list.
2. Click the tab's name, select its text, type the name in the table, and press Enter.
3. Under **Rows**, click **Drop or select dimension**, and click the first dimension in the row's **Rows** cell. Do
   the same for the next dimension in the cell: it goes under the first. Do the same under **Columns** for the
   **Columns** cell. Under **Values**, click **Drop or select metric** for each metric in the **Values** cell.
4. Under **Filters**, click **Drop or select dimension or metric**, and click **Event name**. Under **Conditions**,
   select the match type in the row's **Filter** cell (**exactly matches** or **begins with**). Type its value in
   **Enter expression**, and click **Apply**.

**Total users** counts only the visitors who accepted cookies. **Event count** counts every visitor (design 11).

##### 1. Funnel: where do players drop off?

The funnel shows where players stop, from the Review tab to the review's export. It follows the review only: its
second step takes the imports and the loads on the review's page, and its export step the exports there. A game
imported or loaded to the review counts on the review's page (`/review`), and one to the board on the board's.

**Variables:** the dimensions **Import source** and **Load source**. No metrics.

| Tab | Technique | Steps | Breakdown | Filter |
|---|---|---|---|---|
| From the visit | Funnel exploration | Steps 1 to 5 | None | None |
| By way in | Funnel exploration | Steps 2 to 5 | Import source | None |
| By load | Funnel exploration | Steps 2 to 5 | Load source | None |

The steps:

| Step | Name | Condition |
|---|---|---|
| 1 | Review tab | **Page path and screen class** exactly matches `/review` |
| 2 | Game in | **Event name** matches regex `import_game\|load_saved` (type it without the backslash), **And** **Page path and screen class** exactly matches `/review` |
| 3 | Review open | **Event name** exactly matches `review_open` |
| 4 | Review done | **Event name** exactly matches `review_done` |
| 5 | Export | **Event name** exactly matches `export`, **And** **Page path and screen class** exactly matches `/review` |

To set a tab of the technique Funnel exploration:

1. For the first tab, set **Technique** to **Funnel exploration**. For the next tab, click **+** to the right of
   the tab names, and click **Funnel exploration** in the list. Name the tab, as for a tab of Free form.
2. Click the pencil beside **Steps**. The panel **Edit funnel steps** opens. For each step in the tab's row, type the
   step's name beside **Step**. Set its condition: the dimension (**Event name**, or **Page path and screen class**),
   **exactly matches** (for step 2, **matches regex**), and the value. For steps 2 and 5, click **And** under the
   event's condition, and set the second condition: **Page path and screen class**. A new condition starts at
   **contains**: change it to **exactly matches**. When a list of values drops down under the value, click
   the value in it before **Apply**. Click **Add step** for the next step.
3. Click **Apply**. Leave **Make open funnel** off.
4. For the tab "By way in", click **Drop or select dimension** under **Breakdown**, and click **Import source**. For
   the tab "By load", click **Load source**.

The tabs "By way in" and "By load" start at the second step. A breakdown counts each player under the first value
that the player has, and a page view has no source. "By way in" shows the loads as "(not set)", and "By load" the
imports. A player who opens a game kept from an earlier visit has no import, so the
funnel shows players' first reviews best.

##### 2. Engine defaults: are they right?

The exploration shows how long reviews take, by their settings and by the visitors' machines.

**Variables:** the dimensions **Event name**, **Review depth**, **Engine network**, **CPU cores** and **Review
minutes**. The metrics **Event count**, **Average review seconds** and **Average worker speed**.

| Tab | Technique | Rows | Columns | Values | Filter: Event name |
|---|---|---|---|---|---|
| Time by settings | Free form | Review depth, Engine network | CPU cores | Event count, Average review seconds | exactly matches `review_done` |
| Minutes | Free form | Review minutes | Review depth | Event count | exactly matches `review_done` |
| Machines | Free form | CPU cores | None | Event count, Average worker speed | exactly matches `review_done` |
| Started and ended | Free form | Review depth | Event name | Event count | begins with `review_` |

What each tab shows:

- **Time by settings:** the average time of a review, by depth and network, for each range of cores.
- **Minutes:** how many reviews took each range of minutes, at each depth.
- **Machines:** a worker's average speed, in visits a second, for each range of cores. It sizes the pool of workers.
- **Started and ended:** at each depth, the reviews that started (`review_open`) and the reviews that ended
  (`review_done`). At a depth with many starts and few ends, players do not wait for the review. That depth is too
  deep for a default.

##### 3. GPU: does it pay off?

The exploration shows whether the GPU is faster than a worker, for each kind of GPU.

**Variables:** the dimensions **Event name**, **GPU** and **GPU test outcome**. The metrics **Event count** and
**Average GPU speed ratio**.

| Tab | Technique | Rows | Columns | Values | Filter: Event name |
|---|---|---|---|---|---|
| GPU tests | Free form | GPU | GPU test outcome | Event count, Average GPU speed ratio | exactly matches `gpu_test` |

##### 4. Features: which earn their place?

The exploration shows how many players use each feature, against how many players open a review. Its column tells the
review's features (`/review`) from the Analysis board's (`/analysis`).

**Variables:** the dimensions **Event name**, **Feature** and **Page path and screen class**. The metric **Total
users**.

| Tab | Technique | Rows | Columns | Values | Filter: Event name |
|---|---|---|---|---|---|
| Feature users | Free form | Feature | Page path and screen class | Total users | exactly matches `feature` |
| Review users | Free form | None | None | Total users | exactly matches `review_open` |
| Board users | Free form | None | None | Total users | exactly matches `analysis_open` |
| Editor users | Free form | Event name | None | Total users | begins with `editor_` |

##### 5. Settings: do the defaults fit?

The exploration shows which engine settings players change, and to what, on the review's page and on the Analysis
board. A setting that most players change away from its default asks for another default.

**Variables:** the dimensions **Event name**, **Setting**, **Setting value** and **Page path and screen class**. The
metrics **Event count** and **Total users**.

| Tab | Technique | Rows | Columns | Values | Filter: Event name |
|---|---|---|---|---|---|
| Changes | Free form | Setting, Setting value | Page path and screen class | Event count, Total users | exactly matches `setting_change` |

##### 6. Imports and exports: do they work?

The exploration shows how games come in, to the review and to the Analysis board, what fails, and what goes out.

**Variables:** the dimensions **Event name**, **Import source**, **Import destination**, **Import failure**, **Load
source**, **Load failure**, **Share network found**, **Share same engine**, **Tool out of date**, **Export kind** and
**Page path and screen class**. The metrics **Event count** and **Total users**.

| Tab | Technique | Rows | Columns | Values | Filter: Event name |
|---|---|---|---|---|---|
| Ways in | Free form | Import source | Import destination | Event count, Total users | exactly matches `import_game` |
| Failed imports | Free form | Import source, Import failure | Import destination | Event count | exactly matches `import_failed` |
| Loads | Free form | Load source | None | Event count, Total users | exactly matches `load_saved` |
| Failed loads | Free form | Load source, Load failure | None | Event count | exactly matches `load_failed` |
| Share links | Free form | Share network found, Share same engine | None | Event count | exactly matches `review_share_open` |
| Old tools | Free form | Tool out of date | None | Event count | exactly matches `tool_out_of_date` |
| Old address | Free form | Import source, Load source | None | Event count | exactly matches `import_forwarded` |
| Missing games | Free form | None | None | Event count | exactly matches `game_missing` |
| Exports | Free form | Export kind | Page path and screen class | Event count, Total users | exactly matches `export` |

#### 7. The data collection settings

In Admin, under **Data collection and modification**, click **Data collection**, and set:

| Setting | State | Why |
|---|---|---|
| Google signals data collection | Off | It ties visits to the Google accounts of signed-in visitors (their location, search and YouTube history). The privacy page does not say so, and the site's consent mode denies Google's advertising signals, so little would come. |
| User-provided data collection, and its automatic detection | Off | It sends hashed contact data, such as email addresses, for Google Ads. The site has no accounts and no such data. The automatic detection reads the pages' text. |
| Granular location and device data collection | On | Google's default: the city and the device's model, from the IP address and the browser that the privacy page names. |
| Advanced settings to allow for ads personalization | Off | The site has no ads. |

If the site ever serves ads, turn on Google signals (and user-provided data, if the site collects contact data), and
change the privacy page in the same release.

#### After the setup

**The changes of 2026-10-14** (design 22: each page's way in, the Review tab, the Analysis board, one import event):

- **Step 1:** the custom dimension **Import destination**. Archive **Analysis source** (its row's **⋮** menu, then
  **Archive**).
- **Exploration 1:** the steps as above, in both tabs: step 1 is the Review tab, step 2 takes Import destination =
  review, and step 5 takes the review's page. To change a step, open its tab, click the pencil beside **Steps**, edit
  the step's condition, and click **Apply**.
- **Exploration 4:** the dimension **Page path and screen class** and its column in **Feature users**, and the tab
  **Board users**.
- **Exploration 5:** the dimension **Page path and screen class**, and its column.
- **Exploration 6:** its name, its variables, the columns of **Ways in** and **Failed imports**, the filter of **Share
  links**, and the tabs **Old address** and **Exports**. Delete the tabs **Analysis ways in** and **Failed analysis**.

**The changes for the board editor** (design 21): the new description of **Import source** (it has
`pasted_position`), and the tab **Editor users** in exploration 4.

**The changes for loads** (design 22: Import and Load apart):

- **Step 1:** the custom dimensions **Load source** and **Load failure**, and the new descriptions of **Import
  source**, **Import failure**, **File with results**, **Share same engine** and **Game own settings**. To change a
  description, click the dimension's row, edit it, and click **Save**.
- **Step 3:** `load_saved` as a key event.
- **Exploration 1:** step 2 in both tabs, as above, and the tab **By load**.
- **Exploration 6:** the dimensions **Load source** and **Load failure**, the tabs **Loads** and **Failed loads**, and
  **Load source** in the rows of **Old address**.

Google shows the events in **Reports → Realtime** at once. The custom dimensions fill the reports within a day or two,
from the time of their registration on, and the explorations show them from then. An exploration with few players
shows few rows. Read it as section "Reading it" says.

### Reading it

- **Few players, so signals, not proof.** The early access is a Discord's worth of players. A difference between two
  groups of ten says little. Read the numbers beside what players say in the Discord.
- **Releases in order:** the footer names each release's commit. Compare a report's weeks before and after a release.
- **Consent:** the counts include every visitor, but users, sessions and returns count only those who accepted
  (design 11).
- **Blockers:** a browser whose blocker stops the Google tag is in no count, also when its visitor accepted. The site
  asks those visitors to allow it until they close the request (design 27), and cannot count how many it asks.
- **Most worth having:** `review_done`'s minutes and speed by machine, which no feedback gives.

## Why

- **One event for each decision,** so that the data answers a question asked before it came, and the site collects
  nothing for its own sake.
- **Ranges,** so that a rare count (a machine of 64 cores, a game of 7 edges) does not set a visitor apart, and the
  reports group well.
- **The game's id after the `#`:** the site's promise is that neither service sees a game. An id made from the moves
  does not show the game, but it ties each page view to one game, and the reports gain nothing from it.
- **A feature once in each review:** the question is how many players use it, not how often.
- **A flag in the browser for internal traffic:** Google's
  [internal traffic article](https://support.google.com/analytics/answer/10104470) lets a site add `traffic_type` to
  its events itself, and Plausible (`plausible_ignore`) and Matomo (a cookie that ignores the visits) use a flag in the
  browser too. The flag changes only its own browser's events, so it needs no secret.

## Alternatives

- **The page views alone:** they cannot answer whether a review finishes, or how long it takes.
- **Cloudflare's service for the events:** it takes none.
- **The game's id kept in the query, removed from each page view by hand** (Google's `page_location`, with its own
  page views off): it depends on a setting in Google's console that a later change could turn on again, and Cloudflare's
  service and the server's logs would still see it.
- **Exact numbers for every count:** a scatter of values that groups badly and could set a visitor apart.
- **An IP rule for internal traffic,** Google Analytics' own way: the owner's machine goes through Cloudflare WARP.
  WARP changes its addresses and shares them among its users. So a rule misses the owner's visits, and it can catch
  other people's visits.

## Consequences

- A review's address is `/review#game=ID`. Older addresses keep working.
- The owner registers the parameters in Google Analytics once (above). Until then the events show in Realtime only.
- A new event or parameter goes into this document, the privacy page and Google's custom definitions together.
- The owner sets the flag of internal traffic once in each browser, and sets the Internal Traffic filter to Active
  once ([hosting.md](../hosting.md), section 4). A browser without the flag counts as before.

## Where it is

- `src/lib/analytics.svelte.ts` (`track`, `trackOnce`, `setVisitor`), `src/lib/measure.ts` (the ranges, tested in
  `src/lib/measure.test.ts`).
- The flag of internal traffic: `src/lib/internalTraffic.ts`, tested in `src/lib/internalTraffic.test.ts`. The site
  reads the address's parameter as it starts, in `src/hooks.client.ts`.
- The events: `src/lib/game/importEvents.ts` (the imports and loads), `src/lib/review/ReviewHome.svelte` (the Review
  tab's imports and loads, deletes, `games_stored`), `src/lib/review/Arrival.svelte` (the tools' imports, the share
  links' and partners' loads), `src/routes/analysis/+page.svelte` (the board's imports and loads, `analysis_open`),
  `src/routes/review/+page.svelte` (the review's events, settings, features, `game_missing`, the address),
  `src/lib/review/ReviewView.svelte` (`onfeature`), `src/lib/ExportMenu.svelte` (`export`),
  `src/lib/analysis/gpu.svelte.ts` (`gpu_test`, the GPU's failure), `workerSpeed` in `src/lib/analysis/pool.ts`,
  `src/routes/practice/+page.svelte` (Practice's events and features), with their parameters in
  `src/lib/practice/practice.ts` (`practiceParams`, `practiceEndParams`, tested in `practice.test.ts`).
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
- [decisions/product.md](../decisions/product.md): "The review's custom depth up to 16,384 visits" (2026-10-18): the
  review's minutes past 60 in three ranges.
