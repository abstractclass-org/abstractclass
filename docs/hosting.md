# Hosting: how the site is set up and deployed

This document tells how Hedge School is served, how each part was set up, and how to deploy, check and roll back.
The decisions and their reasons are in [design/11-early-access.md](design/11-early-access.md) (item 5 and item 7). The
log of the setup is in [decisions/product.md](decisions/product.md) ("Cloudflare Pages: the repository's side" and the
entries before it).

## The parts

| Part | Where | What it does |
|---|---|---|
| The domain | `abstractclass.org`, registered at Porkbun | The site's address is `hedgeschool.abstractclass.org`. |
| DNS | Cloudflare (the zone `abstractclass.org`, free plan), with DNSSEC | Answers for the domain. Porkbun keeps only the registration. |
| The code | The private GitHub repository `abstractclass-org/abstractclass`: `dev` for the work, `main` for the live site | A push to `main` deploys the live site. A push to another branch deploys a preview. |
| The deploy | GitHub Actions (`.github/workflows/deploy.yml`) | On each push: builds the site and uploads it to Pages with Wrangler. `main` goes to production, another branch to a preview (section 3). |
| The host | Cloudflare Pages, the project `hedgeschool`, with no Git connection | Serves the files that the deploy uploads, and runs the one Function. Also at `hedgeschool.pages.dev`. |
| The engine | GitHub Releases of the public repository `abstractclass-org/enclosure-engine` | The module and the networks, pinned by SHA-256 in `engine.lock.json`. The build downloads them. |
| Visit counts | Google Analytics (the property's measurement ID `G-C5RY6DWGWN`) and Cloudflare Web Analytics | Counted in the browser (`src/lib/analytics.svelte.ts`). |
| Tests | GitHub Actions (`.github/workflows/tests.yml`) | On each push to `dev`: the check, the unit tests and the browser tests on Linux, and the layout sweep on Windows ("Deploy, check and roll back"). |
| Practice games | Cloudflare D1: `hedgeschool-games` for production, `hedgeschool-games-preview` for the previews | A Pages Function (`functions/api/practice-games.ts`) keeps each game against HedgeFund when it ends (design 25). |

The site is static files: every page is prerendered, and the engine runs in the visitor's browser. One Pages Function
runs at Cloudflare, on `/api/practice-games` only (`static/_routes.json`): it keeps the practice games (section 7).

## 1. The domain on Cloudflare

1. **Add the domain to Cloudflare:** in the Cloudflare dashboard, add `abstractclass.org` on the free plan. Cloudflare
   copies the DNS records it finds, and names two nameservers.
2. **Turn off DNSSEC at Porkbun first,** if it is on. A DS record at the registry that does not match Cloudflare's keys
   makes the domain fail to resolve.
3. **Change the nameservers at Porkbun:** the domain's "Authoritative Nameservers", to Cloudflare's two
   (`aria.ns.cloudflare.com` and `watson.ns.cloudflare.com`).
4. **Wait** until Cloudflare marks the domain Active (minutes to hours).
5. **Turn on DNSSEC:**
   1. In Cloudflare, **DNS → Settings → Enable DNSSEC**. Cloudflare shows a DS record: Key Tag, Algorithm (13),
      Digest Type (2) and Digest.
   2. At Porkbun, on the domain, edit **Registry DNSSEC** and create a record with these four values (the DS data
      only: leave the key data empty). The Key Tag is also the first number after `DS` in Cloudflare's DS line.
   3. Cloudflare shows Pending until it sees the record (up to a day or two), then Success.

   **The rule:** before the DNS moves away from Cloudflare, remove the DS record at Porkbun first.

Cloudflare's onboarding also suggests:

- **"Allow Cloudflare IP addresses":** not done. It is for a site with its own server behind Cloudflare, whose firewall
  must let Cloudflare's addresses in. Pages has no server of the site's own.
- **Bot Fight Mode:** off. On the free plan it cannot be tuned or skipped by rules, and it can challenge real visitors.
  Bots cost the site nothing: Pages serves static files free and without a limit on requests.
- **Client-side security:** free in its monitoring form, which only lists the scripts the pages run (the site's own,
  Google's tag and Cloudflare's beacon). It blocks nothing. Optional.

## 2. The repository

The site's repository is private on GitHub: `abstractclass-org/abstractclass`. Its remote in the local checkout is
`origin` (SSH). Two branches:

- **`dev`:** the work. Each commit is pushed to it, so that GitHub holds the local work. The deploy (section 3) puts
  each push to `dev` on Pages as a preview deployment, at `dev.hedgeschool.pages.dev` (and at an address for each
  deployment), with the previews' variables.
- **`main`:** the live site. A release brings `main` to `dev`'s commit: `git push origin dev:main` (a fast-forward).
  The deploy then builds it and publishes it at `hedgeschool.abstractclass.org`.

What the repository holds for the deploy and for Pages:

- **The build command,** `npm run build:cloudflare` (`package.json`): it downloads the engine's release and checks each
  file's SHA-256 (`npm run engine -- --deploy`, which refuses a local engine file), runs the tests and the type check,
  then builds into `build/`. A failed test or type error fails the deploy, and the live site stays as it was.
- **No file over 25 MiB:** Pages refuses a larger file. The engine's step stores each network's graph and ONNX
  Runtime's WebAssembly compressed with gzip, and splits a compressed file over 24 MiB into parts. The page joins and
  decompresses them ([design 15](design/15-gpu.md)).
- **Node 24** (`.node-version`): the deploy and the tests take their Node from this file. Node 22 cannot run the tests'
  TypeScript without a flag.
- **The response headers** (`static/_headers`, copied into `build/`): `X-Robots-Tag: noindex` on Cloudflare's own
  addresses (`hedgeschool.pages.dev` and the previews, design 23), and a
  year's cache, never checked again, for the build's hashed code (`/_app/immutable/*`) and the engine's files
  (`/engine/:id/:file`). Their paths name their content, so a file there never changes. `/engine/manifest.json` keeps
  the default: the browser checks it on each load. The meaf.us tools' files (`/bookmarklet.js`,
  `/hedge-school.user.js`, `/hedge-school.meta.js`) have `no-cache`, so the browser checks them at each use: without
  it, Cloudflare lets a browser keep a `.js` file for 4 hours (`max-age=14400`), and a bookmark or Tampermonkey would
  take a deploy's change up to 4 hours late. The zone's Browser Cache TTL (4 hours by default) replaces `no-cache` in
  the reply to the browser. So the zone has a cache rule, "Hedge School: the tools' files follow the site's
  Cache-Control" (the zone's **Caching → Cache Rules**):
  - **When:** the hostname equals `hedgeschool.abstractclass.org`, and the URI path is one of the three files.
  - **Then:** "Eligible for cache", and Browser TTL "Respect origin TTL".

  A cache rule must set the cache eligibility. "Eligible" changes nothing for these files, because Cloudflare caches a
  `.js` file by its extension anyway. The rule names only the three files, so the other files keep the zone's
  defaults. Before the rule, the three files reached the browser with `max-age=14400`. With it, they reach the browser
  with `no-cache`, and Cloudflare's edge checks them at Pages each time (`REVALIDATED`).
- **A 404 page** (`404.html`, adapter-static's fallback, in `vite.config.ts`). Without a `404.html`, Pages serves the
  home page for any address (its rule for single-page applications).
- **The site's version** in the footer: the commit that the build runs from, by Git (`vite.config.ts`).
- **The site's address in the userscript** (`/hedge-school.user.js`, design 11): it updates from there and opens the
  review there. A build of `main` (`CF_PAGES_BRANCH`) names `https://hedgeschool.abstractclass.org`, a build of
  another branch its preview's address (`CF_PAGES_URL`), and a local build the local preview server. The deploy sets
  these two variables, with the names that Cloudflare's own build gave them. Its `CF_PAGES_URL` is the branch's
  preview address, `https://<branch>.hedgeschool.pages.dev`. The variable `SITE_ORIGIN` sets another address, for a
  test.
- **A partner's test pages** (design 18): the build of the branch `partner_test` also takes a partner's save page
  and `from` on the developer's own computer (`localhost`, `127.0.0.1`), so that a partner can test before its own
  site is live (`vite.config.ts` sets `VITE_PARTNER_TEST`). The live site and the `dev` preview take only the
  partners' own https hosts. To give a partner a test site:
  1. Push the commit to test to `partner_test`: `git push origin dev:partner_test`. The deploy puts it on Pages as a
     preview.
  2. In the Pages project's **Deployments**, open the `partner_test` deployment, and copy its own address
     (`https://<hash>.hedgeschool.pages.dev`), not the branch's address.
  3. Give the partner that address. It shows that deployment only, and a later push gives a new address.
  4. To withdraw it, delete the deployment (its **⋯** menu, **Delete deployment**).

To try the build as the deploy runs it: `VITE_EDITION=early npm run build:cloudflare`. From a clean clone, run `npm ci`
first.

## 3. The Pages project and the deploy

The Pages project `hedgeschool` has no Git connection. A GitHub Actions workflow, **Deploy**
(`.github/workflows/deploy.yml`), builds each push and uploads it to the project with Wrangler, Cloudflare's command
line tool.

**Why GitHub Actions, not Cloudflare's own build:** the project first built the repository itself, through Cloudflare's
GitHub app. When the repository moved to the organization `abstractclass-org`, that connection was removed. Cloudflare
cannot add a Git connection to an existing Pages project: only a new project can have one. A new project would need a
move of the domain. So the deploy uploads into the same project, which keeps its domain, its bindings and its
deployments.

**The project's settings stay in Cloudflare:**

- the production branch, `main`;
- the D1 binding `GAMES`, in Production and in Preview (section 7);
- the compatibility date, 2026-10-12, for the Function;
- the custom domain, `hedgeschool.abstractclass.org` (**Custom domains → Set up a custom domain**). The zone is on
  Cloudflare, so Pages adds the DNS record (a CNAME to `hedgeschool.pages.dev`) by itself.

The repository has no Wrangler file. With a Wrangler file that names `pages_build_output_dir`, Pages takes the bindings
from that file, not from the project's settings.

**What the deploy does on each push:**

1. It installs the dependencies (`npm ci`), with the Node of `.node-version`.
2. It sets `CF_PAGES_BRANCH` and `CF_PAGES_URL` for the build (section 2, the site's address in the userscript).
3. It runs `npm run build:cloudflare`, with the variables of the branch (below). A failed test or type error stops the
   deploy, and the site stays as it was.
4. It uploads `build/` and the Function in `functions/` with Wrangler, pinned to one version: `wrangler pages deploy
   build --project-name=hedgeschool --branch=<the branch>`. The branch `main` goes to production. Another branch goes
   to a preview at `<branch>.hedgeschool.pages.dev`: Pages lowercases the branch's name, and puts a hyphen for each
   character that is not a letter or a digit.

**What the deploy needs,** in the repository's **Settings → Secrets and variables → Actions**:

| Name | Kind | Value |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | A Cloudflare API token with one permission: Account, Cloudflare Pages, Edit |
| `CLOUDFLARE_ACCOUNT_ID` | variable | The Cloudflare account's ID |
| `VITE_EDITION` | variable | `early` |
| `VITE_STORE_PRACTICE_GAMES` | variable | `on` |
| `VITE_GA_ID` | variable | The Google Analytics measurement ID (section 4) |
| `VITE_CF_ANALYTICS_TOKEN` | variable | Cloudflare Web Analytics' token (section 5) |

To make the token: in the Cloudflare dashboard, **Account API tokens → Create Token → Custom token**. Give it a name,
the permission **Account → Cloudflare Pages → Edit**, then **Continue to summary → Create Token**
([Cloudflare's guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)).
Paste its value into the repository's secret only. A token that was shown anywhere else (a terminal, a chat) is rolled
(**Roll** on the token), and the new value goes into the secret.

**The build's variables** are read when the site is built, so a change needs a new deploy: a push, or **Actions →
Deploy → Run workflow** on the branch. The workflow gives production and the previews their own:

| Variable | Production (`main`) | Preview (another branch) |
|---|---|---|
| `VITE_EDITION` | `early` | `early` |
| `VITE_GA_ID` | the measurement ID | none, so that previews are not counted |
| `VITE_CF_ANALYTICS_TOKEN` | the token | none |
| `VITE_STORE_PRACTICE_GAMES` | `on` | `on`, so that the previews store games too, in their own database (section 7) |

**Why adapter-static, not Cloudflare's SvelteKit adapter:** Cloudflare's adapter renders pages on a server in a Worker.
This site uses adapter-static, which writes plain files to `build/`, because the site is static by design
([design/02-static-site.md](design/02-static-site.md)). The Cloudflare adapter would also put each request through a
Worker: the free plan's daily request limit would apply, and `_headers` does not apply to a Worker's responses.

**The npm cache:** `actions/setup-node` keeps npm's cache between runs, so `npm ci` downloads less.

**Preview deployments:** each push to a branch other than `main` deploys a preview. Each run of the workflow uses
GitHub Actions minutes, which count against the organization's monthly allowance for private repositories. Preview
addresses are public, and unlisted (`noindex`, design 23), while the live address is indexed. **Preview access** in the
project's settings can put them behind a sign-in (Cloudflare Access).

## 4. Google Analytics

- The property's web stream gives the measurement ID (`G-…`), set as `VITE_GA_ID`. The property is Hedge School's.
- **The stream's name and website URL are labels:** they name the stream (edit them with the pencil in the stream's
  details), and change nothing that is counted. Google Analytics counts every page that runs a tag with the stream's
  ID. Only Hedge School's production build has the ID, so the property counts Hedge School. Its reports separate
  hostnames by the Hostname dimension. To drop a hostname's visits, the property has data filters (**Admin → Data
  collection and modification → Data filters**, a filter on the web host name, which can only exclude). A filter acts
  on new data only.
- **Builds on a developer's machine leave `VITE_GA_ID` unset,** so that test visits are not counted. The early-access
  trials of the consent banner did set it: their visits are in the property, under the hostnames `127.0.0.1` and the
  owner's tailnet address.
- In the stream's enhanced measurement, keep **"Page changes based on browser history events"** on: it counts the
  site's page changes, which happen without a page load.
- **The site's events** (design 17): register each parameter as a custom dimension or metric, mark the key events, and
  set the data retention to 14 months, as design 17's "The setup in Google Analytics" lists them. Without the
  registration, the events show in Realtime only. The early-access test of the events used a made-up ID
  (`G-TEST000000`), so none of its events are in the property.
- The site loads the Google tag itself, in Google's consent mode, advanced form: Google's own snippet is not pasted
  anywhere. A build without `VITE_GA_ID` has no Google code.
- **One property for Hedge School.** Other sites on the domain, from other repositories, can have their own properties:
  each site's reports stay apart, with their own settings, and a site can be handed over or closed alone. Or they can
  share Hedge School's ID, for one report of the whole domain, split by hostname: a visitor who moves between the
  subdomains is then one user, because Google's cookie is set on `abstractclass.org`. A page can also send to two
  properties, its own and one for the whole domain (two `config` commands), which needs a list of IDs in
  `src/lib/analytics.svelte.ts`. Each site asks its own consent: the choice is kept per address.

## 5. Cloudflare Web Analytics

1. In the Cloudflare dashboard, **Web Analytics → Add a site**, and choose the domain, `abstractclass.org`. One site
   covers all its subdomains, as one Google Analytics property does: Cloudflare accepts a site's beacon from any
   hostname that ends with the site's name (`hedgeschool.abstractclass.org` ends with `abstractclass.org`), and its
   dashboard separates them by the **Host** dimension. A site for each subdomain is needed only for separate
   dashboards.
2. Cloudflare turns on its **automatic setup** for a domain it proxies: it adds its beacon to each page of every
   subdomain as the page is served. Change it: **Manage site → "Enable with JS Snippet installation" → Update**. The
   beacon must start only after a page removes a game from its address (design 22), and the site's own code
   makes sure of that.
3. The snippet that Cloudflare then shows holds the site's token (`data-cf-beacon='{"token": "…"}'`). Set the token
   alone, the 32 hexadecimal digits, as `VITE_CF_ANALYTICS_TOKEN`, and deploy again. The site adds the beacon itself
   (`src/lib/analytics.svelte.ts`): the snippet is not pasted anywhere. The beacon finds its token by its own script
   element, or else by the element with `data-cf-beacon`, so the site's plain script works as well as the snippet's
   `type='module'`.
4. Do not turn on the Pages project's own Web Analytics (**Metrics → Web Analytics**): it also adds the beacon to every
   page, so visits would count twice.

## 6. Alerts

Cloudflare sends these alerts by email to the account's address (**Observability → Alerts**):

| Alert | Type and settings | What it tells |
|---|---|---|
| Hedge School: deployment failed | Pages, "Project updates": the project `hedgeschool`, Production and Preview, the event "Deployment failed" | A deployment failed at Pages. A failed build fails earlier, in GitHub Actions, before any upload: GitHub's notifications tell of a failed run of **Deploy**. Either way the previous deployment stays live, so the site itself shows no sign. |
| abstractclass.org: Universal SSL certificate | SSL/TLS, "Universal SSL Alert" | The zone's certificate failed its validation, issuance or renewal, or it expired. Without it, browsers refuse the site. |
| Hedge School: 5xx from Pages | Custom alert (beta), detection method Threshold: the query below, 3 or more in an evaluation window of 5 minutes. It runs each minute. While the condition holds, it sends the email again each hour. | Pages answered requests to the live site with a server error. The site is static, so Pages should give none. |

The 5xx alert's query, in the alert's **Custom SQL**:

```sql
SELECT count() AS "value"
FROM "events"."httpRequests"
WHERE "accountTag" = '<the account ID>' AND "originResponseStatus" >= 500
  AND "clientRequestHttpHost" = 'hedgeschool.abstractclass.org'
```

The query counts the status that Pages gave (`originResponseStatus`), not the status at the edge. The table
`events.httpRequests` has rows with the edge status 504 for the custom domain, and Logs and the dashboards do not show
them. Logs shows 404 for the same requests, for example `/favicon.ico`, and no visitor got a 504. Over 3 hours, these
rows reached 7 in one interval of 5 minutes, so an alert on the edge status would send false alarms. None of them has
an origin status of 500 or more.

A deployment that succeeds sends no email: each push to `dev` deploys a preview, and those emails would be noise. The
weekly Web Analytics summary is not set ([decisions/open-items.md](decisions/open-items.md)).

**The dashboard "Error monitoring"** (**Observability → Dashboards**, from Cloudflare's template): the 4xx and 5xx
answers over time, the origin's errors, the status codes, and the top paths of 4xx and 5xx answers. It reads
Cloudflare's analytics of the whole account, so its counts include the previews and the `pages.dev` addresses.

## 7. Practice games (D1)

The games against HedgeFund go to a D1 database when they end (design 25). Production and the previews each have
their own, so that test games never mix with the players' games. The schema is the files in `migrations/`. The
databases and their bindings are set up once, in the Cloudflare dashboard:

1. **Create the two databases.** Go to **D1 SQL database** ([the page](https://dash.cloudflare.com/?to=/:account/workers/d1)),
   select **Create Database**, and give the name `hedgeschool-games`. Leave the location as Cloudflare chooses it.
   Then create a second one, `hedgeschool-games-preview`.
2. **Make the tables in each.** Open `hedgeschool-games` and select **Console**. Paste the whole of
   `migrations/0001_practice_games.sql`, and run it. Then paste the whole of `migrations/0002_deleted_browsers.sql`,
   and run it. Do the same in `hedgeschool-games-preview`. Each database then lists the tables `practice_games` and
   `deleted_browsers`. If a database has `practice_games` already, run only the second file.
3. **Bind them to the project.** Go to **Workers & Pages**, select `hedgeschool`, then **Settings → Bindings**. With
   the environment selector at the top right on **Production**: **Add → D1 database**, the variable name `GAMES`, the
   database `hedgeschool-games`, and **Save**. Then with the selector on **Preview**: **Add → D1 database**, the
   variable name `GAMES`, the database `hedgeschool-games-preview`, and **Save**. The name `GAMES` is the one that the
   Function reads, in both environments.
4. **Turn the sending on:** the repository's variable `VITE_STORE_PRACTICE_GAMES` is `on`, for production and the
   previews (section 3).
5. **Deploy again:** push to `dev`, or run the workflow **Deploy** on `dev` (**Actions → Deploy → Run workflow**). A
   binding and a variable take effect from the next deployment.
6. **Check on the preview:** play a game against HedgeFund on `dev.hedgeschool.pages.dev` to its end, or abort it
   after a move. Then, in `hedgeschool-games-preview`'s **Console**, run
   `SELECT id, browser, outcome, edges, received FROM practice_games;`. The game is there.

A later change to the schema is a new file in `migrations/`, run the same way in both databases, preview first. Its
comments are block comments (`/* … */`) only: the Console joins a pasted file into one line, where a line comment
(`--`) hides the rest of the file.
Without its binding, the Function answers 503, and the games wait in the players' browsers (the site sends them on
the next visit).

## Deploy, check and roll back

- **Check the tests first:** release only a commit whose run of the workflow **Tests** passed (GitHub, the
  repository's **Actions** tab, or the mark beside the commit). On each push to `dev` it runs two jobs at the same time
  (`.github/workflows/tests.yml`). Each one builds the site as production does, with the practice games' storage on:
  - **`test`, on Linux,** about 10 minutes: the check, the unit tests, the layout sweep in Chromium, and a Decline in
    one tab while a practice game is open in another (tests/practice-games.spec.ts).
  - **`test-windows`, on Windows:** the layout sweep in Playwright's own Chromium, with Windows' scroll bars, Windows'
    fonts (`system-ui` is Segoe UI there) and Windows' drawing of text. Linux does not show these. They change where
    text wraps or overflows.

  The sweep loads each page at every width from 360 to 1,920 pixels, with real scroll bars (tests/layout.spec.ts). A
  failed run keeps the failures' screenshots for a week (the run's **Artifacts**: `layout-sweep` for Linux,
  `layout-sweep-windows` for Windows).
- **The sweep in Edge, as an option,** on this computer: it shows Edge's own drawing, with this computer's settings.
  Build as production does (`VITE_EDITION=early npm run build`), start the preview
  (`npm run preview -- --host 127.0.0.1 --port 4173`), and run `npx playwright test --project=edge` (about 7 minutes).
  `npm run test:layout` runs both browsers. Either can run against a preview:
  `BASE_URL=https://dev.hedgeschool.pages.dev npm run test:layout`.
- **Deploy:** release `dev` to `main` (`git push origin dev:main`). The workflow **Deploy** builds and uploads it in a
  few minutes (its build runs the unit tests and the type check again). A failed build leaves the live site as it was.
  Try a change first on `dev`'s preview.
- **Check:** the footer's version is the commit that the deploy built. On the live site, these hold (all true on
  2026-10-12, at commit `f7e179d`):
  - the live address answers with no `X-Robots-Tag`, `hedgeschool.pages.dev` and the previews with `noindex`
    (design 23), and an unknown address answers 404.
  - `/_app/immutable/…` and `/engine/<id>/<file>` carry `Cache-Control: public, max-age=31536000, immutable`, and
    `/engine/manifest.json` does not.
  - the module is served as `application/wasm`, and the larger network (20.6 MB) downloads whole.
  - the header shows Review, The notation and About only, and `/puzzles` leads home.
  - the domain's answers are signed (DNSSEC validated).
- **Roll back:** in the project's deployments, choose an earlier production deployment and **Rollback**. The next push
  deploys again.
- **A new engine:** change `engine.lock.json` to the new release (its tag, each asset's name, SHA-256 and size), and
  push. The paths under `/engine/` name the build and the network, so browsers download the new files and keep no stale
  ones.

## What Cloudflare shows

No code of the site runs at Cloudflare, but Cloudflare sees each request to it. On the free plan, the dashboard shows
the requests and the visits. The menu is **Observability** at the account's level, not the Observability of Workers
under **Compute**.

- **Logs, the dataset "HTTP requests":** a row for each request to a hostname of the zone or of the Pages project.
  These include `hedgeschool.pages.dev` and the previews, such as `partner-test.hedgeschool.pages.dev`.
  - **The fields:** the time, the host, the path without its query, the method, the status at the edge and at the
    origin, and the cache status. Also the country, the IP address, the browser, the operating system, the device type,
    the user agent and the verified bot category. Also the security action and its source, the data center and the
    origin's response time. Logs shows no referrer and no response size. The SQL table that custom alerts query,
    `events.httpRequests`, also has the referrer's host, the query and the bytes sent.
  - **The search:** a query language filters the rows, for example `edgeResponseStatus = 404 AND
    startsWith(clientRequestHTTPHost, "hedgeschool")`. The field list shows each field's top values with their counts.
    The data goes back 30 days.
  - **Two rows for each request to the custom domain,** with the same Ray ID. The zone's row has a cache status
    (Dynamic, Miss, Hit, Revalidated, Bypass) and the origin's status. The row of Pages has the cache status None and no
    origin status. So each total of requests counts the custom domain twice: on the account's home page, in Account
    analytics and in the chart of Logs. To count each request once, filter on the host and on `cacheStatus != "none"`.
    A request to a `pages.dev` address has one row.
- **Analytics, then Web analytics:** the beacon's data. It leaves out bots by default.
  - Visits and page views by referrer, path, host, country, browser and operating system.
  - The Core Web Vitals (LCP, INP, CLS) from the 50th to the 99th percentile, split into their parts. A debug view names
    the element that gave each score.
  - The page's load time, split into DNS, TLS, request and processing.
  - The production build also answers at `hedgeschool.pages.dev`, and Web Analytics counts its visits too. The Host
    breakdown separates them.
- **Analytics, then Account analytics:** totals over 7 days. These are the requests, the bandwidth, the cache's share,
  the rates of 4xx and 5xx answers, the HTTP versions and the content types. It counts the custom domain's requests
  twice, as Logs does.
- **Alerts:** section 6 lists the alerts of this site.
- **Dashboards:** charts from the same data, made from templates (Traffic overview, Security overview, Cache
  performance, Error monitoring) or from nothing.
- **Of no use to this site:** Traces, and the datasets Workers, Containers, R2 and Issues in Logs, are for code that
  runs at Cloudflare. Logpush needs a paid subscription. OpenTelemetry exports the traces of Workers.

How to read the numbers:

- **A low cache hit rate (about 5% of requests) is normal.** Pages keeps the site's files in its own storage, so the
  zone's cache seldom holds them. "Served by Origin" means served by Pages, and it costs nothing.
- **Scanners get most of the 404 answers.** They ask for `/.env`, `/wp-config.php`, `/.git/HEAD` and similar paths.
  Cloudflare's free managed rules block some of them with a 403, and also POST requests to `/`.
- **Crawlers read text as links.** The notices page's code holds the names `LICENSE.txt` and `NOTICES.txt`. A crawler
  asked for them under `/_app/immutable/nodes/`, the folder of that code, and got 404.
- **Crawlers come to every address:** AI search, AI crawlers and search engines. `noindex`, on the preview addresses,
  keeps a page out of an index. It does not stop the crawl.

## Not part of the site

- **Porkbun's DNS records are not used:** the nameservers are Cloudflare's, so only Cloudflare's records answer.
  Records still listed at Porkbun can be removed, for clarity. Porkbun's URL forwarding and email forwarding would not
  work either, for the same reason.
- **The bare domain and `www`:** Cloudflare copied Porkbun's parking records when the domain was added, all proxied: two
  A records for `abstractclass.org` (`207.207.210.107` and `207.207.210.229`) and a CNAME for `www`
  (`pixie.porkbun.com`). Porkbun's parking servers have no certificate for the domain, so Cloudflare answered HTTP 525.
  Cloudflare reads a domain's records from its old nameservers when the domain is added, and Porkbun's ALIAS record for
  the bare domain answered as the parking server's two addresses, so Cloudflare kept them as A records. At Porkbun the
  record showed as an ALIAS to `pixie.porkbun.com`, not as A records. Until the domain has a site of its own, these
  records go (they went on 2026-10-12, at Porkbun and at Cloudflare): the addresses then do not resolve, which is
  cleaner than an error page. The only record left is `hedgeschool`'s CNAME to `hedgeschool.pages.dev`. A later site for
  the bare domain is added as a custom domain of its own Pages project, as section 3 tells, and Pages adds the records.
