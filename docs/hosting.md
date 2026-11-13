# Hosting: how the site is set up and deployed

This document tells how Hedge School is served, how each part was set up, and how to deploy, check and roll back.
Section 8 tells the same of the hub at `abstractclass.org`, and section 9 of Cyanotype.
The decisions and their reasons are in [design/11-early-access.md](design/11-early-access.md) (item 5 and item 7). The
log of the setup is in [decisions/product.md](decisions/product.md) ("Cloudflare Pages: the repository's side" and the
entries before it).

## The parts

| Part | Where | What it does |
|---|---|---|
| The domain | `abstractclass.org`, registered at Porkbun | The site's address is `hedgeschool.abstractclass.org`. |
| DNS | Cloudflare (the zone `abstractclass.org`, free plan), with DNSSEC | Answers for the domain. Porkbun keeps only the registration. |
| The code | The public GitHub repository `abstractclass-org/abstractclass`: `dev` for the work, `main` for the live site | A push to `main` deploys the live site. A push to another branch deploys a preview. |
| The deploy | GitHub Actions (`.github/workflows/deploy.yml`) | On each push: builds the site and uploads it to Pages with Wrangler. `main` goes to production, another branch to a preview (section 3). A site that is not launched yet deploys previews only ("The launch switch"). |
| The host | Cloudflare Pages, the project `hedgeschool`, with no Git connection | Serves the files that the deploy uploads, and runs the one Function. Also at `hedgeschool.pages.dev`. |
| The engine | GitHub Releases of the public repository `abstractclass-org/enclosure-engine` | The module and the networks, pinned by SHA-256 in `engine.lock.json`. The build downloads them. |
| Visit counts | PostHog (one project for all the sites, section 4) and Cloudflare Web Analytics, both with no cookies | Counted in the browser (`src/lib/analytics.svelte.ts`). Cyanotype uses the same two (section 9). |
| Tests | GitHub Actions (`.github/workflows/tests.yml`) | On each push to `dev`: the check, the unit tests and the browser tests on Linux, and the layout test on Windows ("Deploy, check and roll back"). |
| Documents | GitHub Actions (`.github/workflows/docs.yml`) | On each push to `dev`: refuses an added line over 120 characters in a Markdown file of the pushed range. |
| Practice games | Cloudflare D1: `hedgeschool-games` for production, `hedgeschool-games-preview` for the previews. Cyanotype has `cyanotype-games` and `cyanotype-games-preview` | A Pages Function (`functions/api/practice-games.ts`) keeps each game against HedgeFund when it ends (design 25). Cyanotype's own Function keeps its games against Stamp Duty (section 9). |
| The hub | `apps/hub/public`, deployed by the job `hub` of **Deploy** to the Pages project `abstractclass` | The organization's front page at `abstractclass.org`: static files, with no build, script or storage (section 8). |
| Cyanotype | `apps/cyanotype`, deployed by the job `cyanotype` of **Deploy** to the Pages project `cyanotype` | Blueprints' site at `cyanotype.abstractclass.org`: prerendered pages, with its own Function for its practice games, and the same analytics as Hedge School's (section 9). |

The site is static files: every page is prerendered, and the engine runs in the visitor's browser. One Pages Function
runs at Cloudflare, on `/api/practice-games` only (`static/_routes.json`): it keeps the practice games (section 7).

## 1. The domain on Cloudflare

**The owner's steps, once.**

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
  and Cloudflare's beacon). It blocks nothing. Optional.

## 2. The repository

The site's repository is public on GitHub: `abstractclass-org/abstractclass`. So its workflows' runs on GitHub's
standard runners cost no Actions minutes. [Design 11](design/11-early-access.md), item 10, gives its terms. Its
remote in the local checkout is `origin` (SSH). The repository is one npm workspace, with the site in
`apps/hedgeschool` ([design 26](design/26-one-repository.md)): `npm ci` runs at the root, and the site's commands run
in `apps/hedgeschool`. A path here to the site's files starts there ([README.md](README.md)). Two branches:

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
  decompresses them ([design 15](design/15-gpu.md)). The build bundles ONNX Runtime Web in its form that takes its
  WebAssembly from the page (the resolve condition `onnxruntime-web-use-extern-wasm`, `vite.config.ts`). In its usual
  form, the build copies that file (25.5 MiB) into the site. The steps `build-sizes` and `cyanotype-build-sizes` of
  `npm run check:all` (`scripts/build-sizes.mjs`) fail when a file of Hedge School's build or Cyanotype's is over
  25 MiB, and name the file and its size. So the Tests workflow fails on such a file, and a release does not take it.
  The deploy does not wait for the Tests workflow: on a push with such a file, Wrangler refuses its upload.
  Cloudflare's limit:
  [Limits, "File size"](https://developers.cloudflare.com/pages/platform/limits/).
- **Node 24** (`.node-version`, at the root): the deploy and the tests take their Node from this file. Node 22 cannot
  run the tests' TypeScript without a flag.
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
- **A partner's test pages** (design 18, and Cyanotype's [design 33](design/33-cyanotype.md), "Partner sites"): the
  build of the branch `partner_test` also takes a partner's save page and `from` on the developer's own computer
  (`localhost`, `127.0.0.1`), so that a partner can test before its own site is live. Each site's `vite.config.ts`
  sets `VITE_PARTNER_TEST` for that branch: Hedge School's, and Cyanotype's (section 9). The live sites and the `dev`
  previews take only the partners' own https hosts.

  **The owner's steps, to give a partner a test site.**

  1. Open a terminal in a checkout of `dev` that holds the commit to test. Run `git push origin dev:partner_test`.
     The workflow **Deploy** then puts each site on Pages as a preview, in its own project.
  2. Open the Cloudflare dashboard's **Workers & Pages** page,
     <https://dash.cloudflare.com/?to=/:account/workers-and-pages>. If the dashboard asks for an account, select the
     account that holds the projects `hedgeschool` and `cyanotype`.
  3. Select the Pages project of the partner's site: **hedgeschool** for a partner of Hedge School, **cyanotype** for
     a partner of Cyanotype.
  4. Go to **Deployments**. In the **All deployments** list, find the deployment of the branch `partner_test`. Copy
     its own address, not the branch's address: `https://<hash>.hedgeschool.pages.dev` in **hedgeschool**,
     `https://<hash>.cyanotype-ztp.pages.dev` in **cyanotype**.
  5. Give the partner that address. It shows that deployment only, and a later push gives a new address.
  6. To withdraw the address, select the deployment's **⋯** menu, then **Delete deployment**.

To try the build as the deploy runs it: `VITE_EDITION=early npm run build:cloudflare`, in `apps/hedgeschool`. From a
clean clone, run `npm ci` at the root first.

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

1. It installs the dependencies (`npm ci`, at the root), with the Node of `.node-version`.
2. It sets `CF_PAGES_BRANCH` and `CF_PAGES_URL` for the build (section 2, the site's address in the userscript).
3. It runs `npm run build:cloudflare` in `apps/hedgeschool`, with the variables of the branch (below). A failed test or
   type error stops the deploy, and the site stays as it was.
4. It uploads `build/` and the Function in `functions/` with Wrangler, pinned to one version: `wrangler pages deploy
   build --project-name=hedgeschool --branch=<the branch>`. Wrangler runs in `apps/hedgeschool`, because it takes
   the Function from the `functions/` folder where it runs: from another folder, the deployment has no Function. The
   branch `main` goes to production. Another branch goes to a preview at `<branch>.hedgeschool.pages.dev`: Pages
   lowercases the branch's name, and puts a hyphen for each character that is not a letter or a digit.

**What the deploy needs,** in the repository's **Settings → Secrets and variables → Actions**:

| Name | Kind | Value |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | A Cloudflare API token with one permission: Account, Cloudflare Pages, Edit |
| `CLOUDFLARE_ACCOUNT_ID` | variable | The Cloudflare account's ID |
| `VITE_EDITION` | variable | `early` |
| `VITE_STORE_PRACTICE_GAMES` | variable | `on` |
| `POSTHOG_KEY` | variable | PostHog's project token, given to the builds as `VITE_POSTHOG_KEY` (section 4) |
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
| `VITE_POSTHOG_KEY` | `POSTHOG_KEY` | none, so that previews are not counted |
| `VITE_CF_ANALYTICS_TOKEN` | the token | none |
| `VITE_STORE_PRACTICE_GAMES` | `on` | `on`, so that the previews store games too, in their own database (section 7) |

**Why adapter-static, not Cloudflare's SvelteKit adapter:** Cloudflare's adapter renders pages on a server in a Worker.
This site uses adapter-static, which writes plain files to `build/`, because the site is static by design
([design/02-static-site.md](design/02-static-site.md)). The Cloudflare adapter would also put each request through a
Worker: the free plan's daily request limit would apply, and `_headers` does not apply to a Worker's responses.

**The npm cache:** `actions/setup-node` keeps npm's cache between runs, so `npm ci` downloads less.

**Preview deployments:** each push to a branch other than `main` deploys a preview. Preview addresses are public, and
unlisted (`noindex`, design 23), while the live address is indexed. **Preview access** in the project's settings can
put them behind a sign-in (Cloudflare Access).

## 4. PostHog

- **One project for all the sites,** in PostHog's US region: the app at `https://us.posthog.com`, the events to
  `https://us.i.posthog.com`. Each event names its site's host (`$host`), so a report splits the sites. The project's
  token, which PostHog shows under Settings → Project (`https://us.posthog.com/settings/project`), is the repository
  variable `POSTHOG_KEY`. The deploy gives it to each site's build as `VITE_POSTHOG_KEY`, on
  `main` only. A project token is public: it goes into the pages' code, and it can only send events.
- **The project's settings** (Settings → Project, `https://us.posthog.com/settings/project`):
  - **Web analytics → Enable cookieless tracking:** on. The sites run PostHog in its cookieless mode, and without this
    setting PostHog drops their events. Done on 2026-11-09.
  - **Filter out internal and test users:** an entry that drops the owner's events (the owner's steps, below).
- **Builds on a developer's machine leave `VITE_POSTHOG_KEY` unset,** so that test visits are not counted, and the
  build holds none of PostHog's code. check:all gives both sites' builds a made-up key, for the browser tests, and
  the tests' browser resolves none of PostHog's addresses. It also builds Cyanotype once without the key, and its
  step `cyanotype-no-posthog` refuses a script of that build that holds PostHog's code.
- **The site loads PostHog itself:** posthog-js from npm, in its slim bundle with no external loading
  (`packages/site/src/posthog.ts`, which names each option and why). PostHog's snippet is not pasted anywhere.

**The owner's steps.**

- **Filter out internal and test users,** once, after the release that sends the event property `internal`. Open
  `https://us.posthog.com/settings/project`, and go to its section **Filter out internal and test users**. Click
  **+ Add filter**, choose the event property `internal`, and choose the operator **is not set**. Each entry keeps the
  events that match it, so the owner's events, which have the property, drop out. Then turn on **Enable this filter on
  all new insights**.
- **The owner's own visits** (design 17): a browser with the site's flag of internal traffic gives every event the
  property `internal: true`. Set the flag once in each browser that visits a site: each browser and each browser
  profile, on each device. Open `https://hedgeschool.abstractclass.org/?internal=on`, and, once Cyanotype is live,
  `https://cyanotype.abstractclass.org/?internal=on`: each site keeps its own flag. The address loses `?internal=on` at
  once. The flag holds for all pages of that site in that browser, and not for a preview's address. It stays until
  someone clears the browser's data for the site. A private window forgets it when it closes. To remove the flag, open
  a page of the site with `?internal=off`. To check it, keep the site open, and open PostHog's Activity
  (`https://us.posthog.com/activity/explore`): the browser's events show the property `internal`.
- **Google Analytics, before PostHog:** Hedge School's property (`G-C5RY6DWGWN`) counted the site until the release
  of 2026-11-09's change. No build sends to it after that release. Once the change is on `main`, delete the
  repository variables `VITE_GA_ID` and `CYANOTYPE_GA_ID`: in GitHub, the repository's **Settings → Secrets and
  variables → Actions → Variables**, the delete button of each, or `gh variable delete VITE_GA_ID` and
  `gh variable delete CYANOTYPE_GA_ID` in a clone of the repository.

## 5. Cloudflare Web Analytics

**The owner's steps, once.**

1. In the Cloudflare dashboard, **Web Analytics → Add a site**, and choose the domain, `abstractclass.org`. One site
   covers all its subdomains: Cloudflare accepts a site's beacon from any hostname that ends with the site's name
   (`hedgeschool.abstractclass.org` ends with `abstractclass.org`), and its dashboard separates them by the **Host**
   dimension. A site for each subdomain is needed only for separate dashboards.
2. Cloudflare turns on its **automatic setup** for a domain it proxies: it adds its beacon to each page of every
   subdomain as the page is served. Change it: **Manage site → "Enable with JS Snippet installation" → Update**. The
   beacon must start only after a page removes a game from its address (design 22), and the site's own code
   makes sure of that.
3. The snippet that Cloudflare then shows holds the site's token (`data-cf-beacon='{"token": "…"}'`). Set the token
   alone, the 32 hexadecimal digits, as the repository variable `VITE_CF_ANALYTICS_TOKEN`: in GitHub, the
   repository's **Settings → Secrets and variables → Actions → Variables → New repository variable**. Then deploy
   again: in GitHub, **Actions → Deploy → Run workflow** on `main`. The site adds the beacon itself
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
weekly Web Analytics summary stays off: Cloudflare's Web Analytics shows the visits, pages and speed, and PostHog the
same visits and pages ([design 17](design/17-measurement.md)), so the email would only repeat them.

**The dashboard "Error monitoring"** (**Observability → Dashboards**, from Cloudflare's template): the 4xx and 5xx
answers over time, the origin's errors, the status codes, and the top paths of 4xx and 5xx answers. It reads
Cloudflare's analytics of the whole account, so its counts include the previews and the `pages.dev` addresses.

## 7. Practice games (D1)

The games against HedgeFund go to a D1 database when they end (design 25). Production and the previews each have
their own, so that test games never mix with the players' games. The schema is the files in `migrations/`. The
databases and their bindings are set up once, in the Cloudflare dashboard.

**The owner's steps, once.**

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
4. **Turn the sending on:** in GitHub, the repository's **Settings → Secrets and variables → Actions → Variables →
   New repository variable**, with the name `VITE_STORE_PRACTICE_GAMES` and the value `on`. The deploy gives it to
   production and to the previews.
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

## 8. The hub (abstractclass.org)

The hub is the organization's front page at `abstractclass.org` ([design 26](design/26-one-repository.md), item 3).
It is the folder `apps/hub/public`: static files, with no build, no script, no cookie and nothing kept in the browser.
Its own Pages project, `abstractclass`, serves it, apart from Hedge School's. The job `hub` of the workflow **Deploy**
uploads the folder to that project with Wrangler on each push: `main` to production, another branch to a preview at
`<branch>.abstractclass.pages.dev`. So a push to `dev` deploys a preview at `dev.abstractclass.pages.dev`, and a
release (`git push origin dev:main`) deploys the live hub. The job uses the site's secret `CLOUDFLARE_API_TOKEN` and
variable `CLOUDFLARE_ACCOUNT_ID` (section 3). The token's permission covers every Pages project of the account.

- **Its headers** (`apps/hub/public/_headers`): a Content Security Policy that lets the page load only its own style
  sheets and images (no script, no frame, no form), `nosniff`, no framing by other sites, only the origin as the
  referrer to other sites, HSTS for a year, and `noindex` on Cloudflare's own addresses for the project, as for
  Hedge School (design 23).
- **Its 404 page,** `404.html`: Pages answers each path that the folder does not have with it, and with status 404.
  Without a `404.html`, Pages answers every path with the home page.
- **Its board:** `apps/hub/scripts/enclosure-board.mjs` writes Enclosure's animated board into `index.html` and
  `enclosure-board.css`, from Hedge School's home board (`src/lib/home/replay.json`). Run it again at the root after
  that board's scenes change: `node apps/hub/scripts/enclosure-board.mjs`. The step `hub-board` of `npm run check:all`
  fails when the two files are not what the script writes, and when a colour token of `style.css` is not Hedge
  School's: the script reads `packages/site/src/site.css`, `packages/review/src/review.css` and
  `apps/hedgeschool/src/app.css`.

**The owner's steps, once.** Steps 1 to 3 are done: `https://abstractclass.org` serves the hub.

1. **Make the Pages project, with `main` as its production branch.** Use Wrangler, not the dashboard. A project made
   by drag and drop in the dashboard has no setting for its production branch
   ([Cloudflare's Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/#production-branch-configuration)).
   In a terminal, in the folder `apps/hub` of a checkout of `dev`:
   1. `npx wrangler@4.144.0 login`. A browser tab opens on Cloudflare. Sign in, then select **Allow**.
   2. `npx wrangler@4.144.0 pages project create abstractclass --production-branch=main --force`. If Wrangler asks
      for an account, select the account that holds the project `hedgeschool`. Without `--force`, Wrangler 4.144
      tries to make the project in Cloudflare Workers in place of Pages. That attempt reads the folder's apps, and at
      the repository's root it stops with an error about a workspace. `--force` makes a Pages project, as
      `hedgeschool` is. Only the creation needs it: the commands for a project that exists go to Pages.

   The project's name is `abstractclass`. Its address is `abstractclass.pages.dev`. If that address is taken, Pages
   adds a few characters to the address, not to the name, and Wrangler shows the address. The steps below write the
   address as `abstractclass.pages.dev`. If Wrangler shows another address, use that address in its place.
2. **Deploy its first files.** In a terminal, in the folder `apps/hub` of a checkout of `dev`, run
   `npx wrangler@4.144.0 pages deploy public --project-name=abstractclass --branch=main`. The job `hub` of the
   workflow **Deploy** makes the same upload on each push, with the push's branch. The branch `main` is the
   production branch, so this deployment is the live hub. It stays live until a release puts the hub on `main`.
3. **Give it the domain.** In the Cloudflare dashboard, go to **Workers & Pages**, select the project
   `abstractclass`, then **Custom domains → Set up a domain**. Enter `abstractclass.org`, then select **Continue**
   and **Activate domain**. The zone is on Cloudflare, so Pages adds the DNS record for the bare domain itself (a
   CNAME to the project's `pages.dev` address, which Cloudflare flattens at the bare domain). The bare domain has no
   other record ("Not part of the site", below). The domain shows **Active** when its certificate is ready, in
   minutes.
4. **Check:**
   - `https://abstractclass.org` shows the hub.
   - In the project's **Deployments**, the first deployment is under **Production**, not under **Preview**.
   - The page's response has the header `Content-Security-Policy`, and `https://abstractclass.pages.dev` answers with
     `X-Robots-Tag: noindex` (the browser's developer tools, **Network**, the page's first request).
   - After the next push to `dev`, in GitHub's **Actions → Deploy**, the run's job `hub` passed, and
     `https://dev.abstractclass.pages.dev` shows the hub.
5. **End Wrangler's login** on the computer, if you do not use Wrangler there: `npx wrangler@4.144.0 logout`.

`www.abstractclass.org` has no record and is not part of the hub.

## 9. Cyanotype (cyanotype.abstractclass.org)

Cyanotype is Blueprints' site ([design 33](design/33-cyanotype.md)), in `apps/cyanotype`. Its own Pages project,
`cyanotype`, serves it, apart from Hedge School's and the hub's. The job `cyanotype` of the workflow **Deploy** checks
and builds it on each push, as the site's job does: the packages' checks and tests, then the engine's release files
(`npm run engine -- --deploy`), the site's type check, unit tests and build. Then it uploads `build/` with Wrangler:
`main` to production, another branch to a preview at `<branch>.cyanotype-ztp.pages.dev`. A failed step deploys
nothing. Until Cyanotype's launch (step 3 below), the job deploys previews only: a push to `main` does not run it
("The launch switch", below). The job uses the site's secret `CLOUDFLARE_API_TOKEN` and its variables
`CLOUDFLARE_ACCOUNT_ID` and `VITE_EDITION` (section 3), Cyanotype's own two variables of its analytics
("Cyanotype's analytics", below), and its switch of the practice games' storage, `CYANOTYPE_STORE_PRACTICE_GAMES`
("Cyanotype's practice games", below).

- **The early access:** the build takes the repository variable `VITE_EDITION`, as the site's build does. With
  `early`, it is Cyanotype's early access: the header shows "Early Access" beside the name, and it leads to the About
  page's section on the early access ([design 33](design/33-cyanotype.md), "Decision", item 11).

- **The engine's files** come from Blueprints' release that `engine.lock.json` pins, in the public repository
  `abstractclass-org/blueprints-engine`. The step checks each file's SHA-256, and `--deploy` refuses a file from the
  engine repository's checkout on this machine. The build copies the files from `static/engine`.
- **ONNX Runtime's files,** as for Hedge School (section 2): the build bundles the GPU worker and the practice bot's
  worker with ONNX Runtime Web, in its form that takes its WebAssembly from the page. The lock has a GPU module, so the
  engine's step stores ONNX Runtime's two files in `static/engine`, the WebAssembly compressed with gzip. The engine
  runs on the visitor's GPU as Hedge School's does: the review, the Analysis board and the practice bot.
- **The build's address** goes into the build: the userscript updates from it and opens its games there. For `main`,
  it is the live address. For another branch, it is the preview's address. The project's pages.dev address is not
  `cyanotype.pages.dev`, which belongs to another site. So, before the build, the job reads the address from the
  project in Cloudflare's API (its `subdomain`). When the API gives no address, the job fails with a message and
  deploys nothing.
- **Its pages** are prerendered. Each names its live address as canonical (`src/lib/site.ts`), wherever it is served.
  The build still needs the branch's variables (`CF_PAGES_BRANCH`, `CF_PAGES_URL`) for its userscript's address. A
  build without them gives a userscript that loads from the local preview server (`vite.config.ts`).
- **Its headers** (`static/_headers`): `noindex` on Cloudflare's own addresses for the project, a year's cache for
  the build's hashed files and for the engine's files under `/engine/<id>/`, and `no-cache` on the tools' files, whose
  paths stay when their content changes (`bookmarklet.js`, `cyanotype.user.js` and `cyanotype.meta.js`), as for Hedge
  School (design 23). Each engine folder's name comes from `engine.lock.json` (a file's `dir`, else its id), and names
  the engine's release (`engine-<commit>`) or the network. ONNX Runtime's folder, which comes with a GPU module, names
  its version (`ort-<version>`). So a new release or a new network gets a new path, and `/engine/manifest.json` stays
  out of the rule.
  `static/robots.txt` names its sitemap.
- **A partner's test pages,** as Hedge School's (section 2, "A partner's test pages"): the build of the branch
  `partner_test` also takes a partner's pages on the developer's own computer (`vite.config.ts` sets
  `VITE_PARTNER_TEST`). Cyanotype has no partner yet, so this build is the only one that saves a review to a partner
  or opens a review that a partner kept.
- **Its 404 page,** `404.html`, from the build (`vite.config.ts`): Pages answers each path that the site does not
  have with it, and with status 404.
- **Its one Function,** on `/api/practice-games` only (`static/_routes.json`), keeps the practice games against Stamp
  Duty in Cyanotype's own D1 databases ("Cyanotype's practice games", below). The job runs Wrangler in
  `apps/cyanotype`, so the deployment takes Cyanotype's `functions/` folder, not Hedge School's. The browser keeps the
  visitor's games, settings and choices (its Privacy page).

**The owner's steps, once** (abscls-8tl1.3). Do not set a repository variable for the project: the workflow names it.
Each push to `dev` deploys a preview at `dev.cyanotype-ztp.pages.dev`.

1. **Make the Pages project, with `main` as its production branch.** Done (2026-11-04), with Wrangler 4.144.0:
   `npx wrangler@4.144.0 pages project create cyanotype --production-branch=main --force`. The project's name is
   `cyanotype`. Its address is `https://cyanotype-ztp.pages.dev/`, because `cyanotype.pages.dev` belongs to another
   site.
2. **Give it the domain.** Done (2026-11-05), before the first deployment: in the Cloudflare dashboard,
   **Workers & Pages**, the project `cyanotype`, **Custom domains → Set up a domain**, `cyanotype.abstractclass.org`.
   The zone is on Cloudflare, so Pages added the DNS record itself: a CNAME from `cyanotype` to
   `cyanotype-ztp.pages.dev`.
   Cloudflare's guide
   ([Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-domain)) asks
   for no deployment before the domain. The domain serves the production deployment. Until the first one exists, it
   answers with status 522.
3. **Deploy the live site from a release, when the owner says to launch it.** Do not deploy from a local build. A
   local build has no branch variables, so its userscript loads from `http://127.0.0.1:4173`. The job also runs the
   checks and the tests before it uploads. Just before this release, commit Cyanotype's launch on `dev`: in
   `.github/workflows/deploy.yml`, remove the line `if: github.ref_name != 'main'` of the job `cyanotype` and the
   comment above it. Push `dev`. Then release `dev`: `git push origin dev:main`. A release also releases Hedge School
   and the hub: the push sends all of `dev` to `main`. In GitHub, go to **Actions → Deploy**, and open the run of this
   push. Its job `cyanotype` uploads the build to the production branch. When the job shows a pass, do the checks of
   step 4.
4. **Check:**
   - Run the check of a deployed site ("Deploy, check and roll back", below) in `apps/cyanotype`, against the live
     address and against the project's address: `git fetch`, then
     `node scripts/release-check.mjs https://cyanotype.abstractclass.org` and
     `node scripts/release-check.mjs https://cyanotype-ztp.pages.dev`. Make sure that the last line of each run says
     `release-check: PASS`.
   - Open `https://cyanotype.abstractclass.org/practice`. Make sure that it shows the button **Play as Blue**, and not
     the message "The engine is not on this site." The script cannot do this check: it reads the site's files, but
     it does not run the page's code, which starts the engine.
   - In the project's **Deployments**, the first production deployment is under **Production**, not under
     **Preview**. The script cannot do this check: it reads the site's public addresses only, not Cloudflare's
     dashboard.
   - After the next push to `dev`, when the run's job `cyanotype` in GitHub's **Actions → Deploy** has finished, run
     `git fetch` and `node scripts/release-check.mjs https://dev.cyanotype-ztp.pages.dev` in `apps/cyanotype`. Make
     sure that the last line says `release-check: PASS`. The footer's version shows that the job deployed the push.
5. **End Wrangler's login** on the computer of step 1, if you do not use Wrangler there:
   `npx wrangler@4.144.0 logout`.

### Cyanotype's analytics

Cyanotype counts its visits and events as Hedge School does ([design 33](design/33-cyanotype.md), "Analytics"):
PostHog and Cloudflare Web Analytics, both without cookies, so it asks for no consent to them. Its consent banner
asks only about the random number that links the practice games ("Cyanotype's practice games", below). The job
`cyanotype` gives the build two repository variables under the names that the code reads. Only a push to `main` gives
them, so previews are not counted. Until Cyanotype's launch, the job deploys previews only, so no build has them. A
build without them measures nothing.

| Name in the build | Repository variable | Value |
|---|---|---|
| `VITE_POSTHOG_KEY` | `POSTHOG_KEY` | The token of the one PostHog project of all the sites (section 4), as for Hedge School |
| `VITE_CF_ANALYTICS_TOKEN` | `VITE_CF_ANALYTICS_TOKEN` | The token of the domain's Web Analytics site (section 5), as for Hedge School |

- **Neither service needs a step of Cyanotype's own.** The account's one Web Analytics site, `abstractclass.org`
  (section 5), takes the beacon of every subdomain, and its dashboard splits the visits by host. The PostHog project
  takes the events of every site, and each event names its host. The flag of internal traffic is Cyanotype's own:
  once Cyanotype is live, open `https://cyanotype.abstractclass.org/?internal=on` once in each browser and each browser
  profile that visits it, on each device. The address loses `?internal=on` at once, and the flag stays until someone
  clears the browser's data for the site.

### Cyanotype's practice games

The games against Stamp Duty go to a D1 database when they end, as Hedge School's games against HedgeFund do (section 7
and design 25, and [design 33](design/33-cyanotype.md), "Practice against Stamp Duty"). Production and the previews each
have their own, apart from Hedge School's: Blueprints' games never mix with Enclosure's. The schema is the file
`apps/cyanotype/migrations/0001_practice_games.sql`: Hedge School's two tables, with the column `moves` in the place of
`edges`. The Function (`apps/cyanotype/functions/api/practice-games.ts`) is Hedge School's
(`@abstractclass/practice/storedFunction.ts`), with Blueprints' check. Without its binding, it answers 503, and the
games wait in the players' browsers. A build sends games only with `CYANOTYPE_STORE_PRACTICE_GAMES` set to `on`. Without
it, Cyanotype keeps each game in the player's games only, and asks for no consent.

**The owner's steps, once.**

1. **Create the two databases.** Go to **D1 SQL database** ([the page](https://dash.cloudflare.com/?to=/:account/workers/d1)),
   select **Create Database**, and give the name `cyanotype-games`. Leave the location as Cloudflare chooses it. Then
   create a second one, `cyanotype-games-preview`.
2. **Make the tables in each.** On **D1 SQL database** ([the page](https://dash.cloudflare.com/?to=/:account/workers/d1)),
   open `cyanotype-games` and select **Console**. Paste the whole of the file
   `apps/cyanotype/migrations/0001_practice_games.sql`
   ([its text](https://github.com/abstractclass-org/abstractclass/raw/dev/apps/cyanotype/migrations/0001_practice_games.sql)),
   and run it. Do the same in `cyanotype-games-preview`. Each
   database then lists the tables `practice_games` and `deleted_browsers`.
3. **Bind them to the project.** Go to **Workers & Pages**
   ([the page](https://dash.cloudflare.com/?to=/:account/workers-and-pages)), select `cyanotype`, then
   **Settings → Bindings**. With the
   environment selector at the top right on **Production**: **Add → D1 database**, the variable name `GAMES`, the
   database `cyanotype-games`, and **Save**. Then with the selector on **Preview**: **Add → D1 database**, the variable
   name `GAMES`, the database `cyanotype-games-preview`, and **Save**. The name `GAMES` is the one that the Function
   reads, in both environments. Until Cyanotype's launch, only the previews use their binding.
4. **Turn the sending on:** in GitHub, the repository's **Settings → Secrets and variables → Actions → Variables →
   New repository variable**
   ([the page](https://github.com/abstractclass-org/abstractclass/settings/variables/actions/new)), with the name
   `CYANOTYPE_STORE_PRACTICE_GAMES` and the value `on`, then **Add variable**. The job `cyanotype`
   gives it to the build as `VITE_STORE_PRACTICE_GAMES`, for production and for the previews. Hedge School's variable
   `VITE_STORE_PRACTICE_GAMES` does not change Cyanotype's build.
5. **Deploy again:** push to `dev`, or run the workflow **Deploy** on `dev`
   ([the page](https://github.com/abstractclass-org/abstractclass/actions/workflows/deploy.yml): **Run workflow**, the
   branch `dev`, then **Run workflow**). A binding and a variable take effect from the next deployment.
6. **Check on the preview:** in `apps/cyanotype`, run `git fetch`, then
   `node scripts/release-check.mjs https://dev.cyanotype-ztp.pages.dev`. Make sure that the line of the Function says
   PASS (`/api/practice-games` answers 400 to a request that is not JSON). Then on
   `https://dev.cyanotype-ztp.pages.dev/practice`, play a game against Stamp Duty. If the banner "Help Cyanotype get
   better" shows, select **Accept** or **Decline**. Choose **Play as Red**, wait for
   Stamp Duty's first move, then select **Resign** and confirm with **Resign**. In `cyanotype-games-preview`'s
   **Console**, run `SELECT id, browser, outcome, moves, received FROM practice_games;`. The game is there, with the
   outcome `resigned`.

A later change to the schema is a new file in `apps/cyanotype/migrations/`, run the same way in both databases,
preview first. Its comments are block comments (`/* … */`) only: the Console joins a pasted file into one line, where a
line comment (`--`) hides the rest of the file.

## The launch switch

A push to `main` deploys each launched site live, and a push to another branch deploys a preview of each site. A site
that is not launched yet must not go live with another site's release. So its job in `.github/workflows/deploy.yml`
deploys previews only: on `main`, an `if:` on the branch skips the job. The job `cyanotype` has this switch until
Cyanotype's launch:

```yaml
  cyanotype:
    if: github.ref_name != 'main'
```

A skipped job deploys nothing, and the site's live address stays as it was. The run of `main` still passes. The
switch is enough because the production branch of each Pages project is `main` (section 3, and step 1 of sections 8
and 9). Wrangler's `--branch` gets the same branch name that the `if:` tests, so a push to another branch makes only
a preview.

**A new site's job starts with the switch.** The commit that adds the job to `deploy.yml` gives it the `if:` and the
comment above it. So its previews deploy at once, and its live deploy waits for its launch.

**A site's launch is one commit,** made on `dev` when the owner says to launch the site. It removes the job's `if:` and
the comment above it. The workflow's other comments and this document stay true after the launch, so the commit needs
no other change to them. The commit reaches `main` with the next release (`git push origin dev:main`), and only when
the owner says to release. Its run deploys the site live, with the other launched sites. Make the commit just before
that release: when it is on `dev`, any release launches the site. After the deploy, mark the launch done in the
site's own section, as its other steps are. Section 9, step 3, gives Cyanotype's release.

The switch stops one mistake: a site that is not launched yet goes live with another site's release. It does not stop
a push to `main` that the owner did not say to make. The owner's word to release stays the gate on every push to
`main`.

## Deploy, check and roll back

- **Check the tests first:** release only a commit whose run of the workflow **Tests** passed (GitHub, the
  repository's **Actions** tab, or the mark beside the commit). On each push to `dev` it runs two jobs at the same time
  (`.github/workflows/tests.yml`). Each commit has its own run: a push cancels no run and waits for none, so each
  commit keeps its result. Each job builds the site as production does, with the practice games' storage on:
  - **`test`, on Linux:** `npm run check:all` at the root, then the browser tests in Chromium, every spec file in
    tests/. Among them are the layout test, and a Decline in one tab while a practice game is open in another
    (tests/practice-games.spec.ts). `check:all` holds the one list of the checks before the browser tests
    (`scripts/check-all.mjs`). Run it before a push to get the same result. Cyanotype's engine tests take a large part
    of the job's time: its practice games against the bot, and a review of the test game's first three turns with the
    engine (`cyanotype-live-review.spec.ts`). The other tests of its review load a stored review.
  - **`test-windows`, on Windows:** the layout test in Playwright's own Chromium, with Windows' scroll bars, Windows'
    fonts (`system-ui` is Segoe UI there) and Windows' drawing of text. Linux does not show these. They change where
    text wraps or overflows.

  The sweep loads each page at every width from 360 to 1,920 pixels, with real scroll bars (tests/layout.spec.ts). A
  failed run keeps the failures' screenshots for a week (the run's **Artifacts**: `layout-sweep` for Linux,
  `layout-sweep-windows` for Windows).

  Both jobs also serve Cyanotype's build (`apps/cyanotype`) on port 4174, beside the site's preview on port 4173, and
  set `CYANOTYPE_BASE_URL=http://127.0.0.1:4174`. The build is the early access (`VITE_EDITION=early`), as the site's
  is. It has the engine's release files that `apps/cyanotype/engine.lock.json` pins, so the tests that need them run,
  such as the review of Cyanotype's test game. The job `test` takes the build and the files that `check:all` made (its
  steps `cyanotype-engine` and `cyanotype-build`). The job `test-windows` gets the files and builds in steps of its own,
  because `check:all` does not run there. Each job keeps Cyanotype's downloads in a cache, by the lock. Each Cyanotype
  test that a job runs uses this preview. In CI, `playwright.config.ts` stops the run with a message when
  `CYANOTYPE_BASE_URL` is missing. Outside CI, the Cyanotype tests skip without it
  ([working-notes.md](working-notes.md), "The tests on Cyanotype").
- **The sweep in Edge, as an option,** on this computer, by the owner: it shows Edge's own drawing, with this
  computer's settings. A plain `npm run test:layout` runs Chromium alone. The project `edge` comes only when the
  environment has `HS_EDGE=1`. In `apps/hedgeschool`, build as production does (`VITE_EDITION=early npm run build`),
  start the preview (`npm run preview -- --host 127.0.0.1 --port 4173`), and run `HS_EDGE=1 npx playwright test
  --project=edge` (about 7 minutes). A worker does not run Edge, because its profile signs in to the owner's Windows
  account. Any run can use another site: `BASE_URL=https://dev.hedgeschool.pages.dev npm run test:layout`.
- **Deploy:** release `dev` to `main` (`git push origin dev:main`). The workflow **Deploy** builds and uploads each
  launched site in a few minutes (Hedge School's build runs the unit tests and the type check again). A failed build
  leaves the live site as it was. A site that is not launched yet deploys nothing live ("The launch switch", above).
  Try a change first on `dev`'s preview.
- **Check:** `node scripts/release-check.mjs <base URL> [<commit>]` in the site's folder (`apps/hedgeschool` or
  `apps/cyanotype`) does the checks below against the live site or a preview, when the workflow **Deploy** has
  finished. Without a commit, it takes `origin/main` for the live site and the project's address, and `origin/dev` for
  dev's preview: run `git fetch` first. It checks the engine's files against the `engine.lock.json` of a commit, as
  Git keeps it, never against the checkout's file. That commit is the one that the command names. When the command
  names none, it is the commit that the home page's footer names, the deployed commit. So after a rollback, a run with
  no commit says FAIL on the footer's line, which expects the branch's commit, and checks the engine's files against
  the deployed commit's lock. Its first line names the lock's commit, and says `read from the footer` when the footer
  gave it. A home page that does not answer, a footer that names no commit, or a commit that the clone does not have
  stops it with exit code 2. For a commit that the clone does not have, its line says to run `git fetch`. Each line
  says PASS, FAIL or INFO, and the last line says `release-check: PASS` or `release-check: FAIL`. The checks that both
  sites share are in `packages/site/src/release-check.mjs`. Each site's script gives its addresses, its header's links
  and its pages that lead home, and adds its own checks. The header's links, the pages that lead home and the site's
  own checks come from the checkout's script, not from the commit. When the code that gives them (the site's script
  and `packages/site/src/release-check.mjs`) differs between the commit and the checkout, each of their lines says
  `(from this checkout)` after the name of its check. A request after the home page that gets no answer says FAIL on
  its check's line, with `the request failed` and the reason, and the check goes on. Another error of a check, such
  as a body that is not JSON, says FAIL with its message. The checks, all true on Hedge School's live site on
  2026-10-18 at commit `b4f0472`, and on its dev preview on 2026-10-20 at commit `f50704c`:
  - the footer's version is the commit that the deploy built.
  - the live address answers with no `X-Robots-Tag`, the project's address (`hedgeschool.pages.dev`,
    `cyanotype-ztp.pages.dev`) and the previews with `noindex` (design 23), and an unknown address answers 404.
  - `/_app/immutable/…` and `/engine/<id>/<file>` carry `Cache-Control: public, max-age=31536000, immutable`, and
    `/engine/manifest.json` does not.
  - the manifest names every file of `engine.lock.json`, with its SHA-256. The module is served as `application/wasm`.
    The largest network (Hedge School's 20.6 MB, Cyanotype's 2.2 MB) and the terms download whole, as the page reads
    them (the manifest's parts, joined and decompressed), with the lock's SHA-256.
  - the header shows Practice, Review, Analysis, Tools, Notation and About.
  - on Hedge School only: `/puzzles`, `/learn` and `/lab/engine` lead home (the early access). Cyanotype has none of
    these pages, so its early access hides no page.
  - on Hedge School only: the Function on `/api/practice-games` answers 400 to a request that is not JSON. Cyanotype
    has no Function (section 9).
  - on the live site only: the domain's answers are signed (DNSSEC validated).

  A release's own changes need their own checks beside these.
- **A new engine:** change `engine.lock.json` to the new release (its tag, each asset's name, SHA-256 and size), and
  push. The paths under `/engine/` name the build and the network, so browsers download the new files and keep no stale
  ones. So a changed file needs a new path: a new id in the lock, and a new `dir` for a file that has one. Never give
  a deployed path other bytes, for example an asset replaced in its release, or a network exported again under its
  name. A browser keeps the old file for a year.
- **Roll back:** a rollback makes an earlier production deployment of one site live again, at once, with no build.
  Pages keeps each deployment. Only a production deployment whose build succeeded can come back, not a preview. A site
  that is not launched yet has no production deployment, so it has nothing to roll back ("The launch switch"). A
  rollback changes nothing in Git. The next push to `main`, or a run of **Deploy** on `main`, deploys `main` again to
  every launched site. That ends the rollback. **Deploy** gives each deployment its commit and the commit's first line
  (`--commit-hash`, `--commit-message`).

  **The owner's steps, for each site to roll back.**

  1. Open the Cloudflare dashboard's **Workers & Pages** page,
     <https://dash.cloudflare.com/?to=/:account/workers-and-pages>. If the dashboard asks for an account, select the
     account that holds the projects of step 2.
  2. Select the site's Pages project: `hedgeschool` for Hedge School (`https://hedgeschool.abstractclass.org`),
     `cyanotype` for Cyanotype (`https://cyanotype.abstractclass.org`, after its launch), or `abstractclass` for the
     hub (`https://abstractclass.org`).
  3. Go to **Deployments**. In the **All deployments** list, find two production deployments (branch `main`): the one
     to undo, which is live now, and the one of the release before it. Note the commit of each. The list holds the
     previews (other branches) too. Skip them.
  4. Select the three dotted actions menu of the deployment of the release before, then **Rollback to this
     deployment**. A confirmation window opens. Confirm the rollback in it. The site's production deployment changes
     at once.
  5. Check the site.
     - For Hedge School and Cyanotype, open a terminal in a checkout of `dev`. Run `git pull`, then `npm ci` at the
       repository's root. `git fetch` alone is not enough: it leaves the checkout's older check script, which can
       read the wrong lock. Then run the site's check:
       - For Hedge School, in the folder `apps/hedgeschool`, run
         `node scripts/release-check.mjs https://hedgeschool.abstractclass.org <the commit of the release before>`.
       - For Cyanotype, in the folder `apps/cyanotype`, run
         `node scripts/release-check.mjs https://cyanotype.abstractclass.org <the commit of the release before>`.

       The first line must end with `the engine lock of commit` and the first 7 characters of the commit of the
       release before. The last line must say `release-check: PASS`. If a line says that the commit is not a commit
       in this clone, run the command that the line gives, then run the check again. If a line says
       `the request failed`, make sure that the computer is connected to the internet, then run the check again. The
       check takes three parts from the checkout, not from the commit: the header's links, the pages that lead home
       (`/puzzles`, `/learn` and `/lab/engine`, on Hedge School only) and Hedge School's Function on
       `/api/practice-games`. When the checkout's code of the check differs from its code at the commit of the
       release before, the lines of these parts say `(from this checkout)`. Such a line can say FAIL although the
       rollback worked, because the checkout's check can expect a change that the rollback undid. A FAIL on a line
       without `(from this checkout)` shows a fault of the site. For a FAIL with `(from this checkout)` on the
       header's links or on a page that leads home, open the site's address (`https://hedgeschool.abstractclass.org`
       or `https://cyanotype.abstractclass.org`) in a browser. Make sure that the header and those pages are as they
       were before the release that you undid. For a FAIL with `(from this checkout)` on the Function, run
       `git log --oneline <the commit of the release before>..HEAD -- scripts/release-check.mjs` in the folder
       `apps/hedgeschool`. It lists the commits after the release before that changed Hedge School's check script. If
       it lists no commit, the FAIL shows a fault of the site. If it lists commits, the FAIL can come from their
       change.
     - For the hub, open `https://abstractclass.org` in a browser and reload the page. The hub shows no version and
       has no check script: check that the change to undo is gone.
  6. Before the next release, undo the bad change on `dev`. In a terminal, in a checkout of `dev`, run `git fetch`,
     then `git log --oneline <the commit of the release before>..<the commit of the deployment undone>`. It lists the
     commits of the release that you undid. Revert each bad one (`git revert <commit>`), or commit a fix. Then run
     `git push origin dev`. Otherwise the next push to `main` deploys the bad change again.

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
    `events.httpRequests`, also has the bytes sent. It lists the referrer's host and the query too, but the free plan
    refuses them.
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
- **A broken link of the site shows in Web Analytics, not among the 404 answers.** On the free plan, no record of a
  request gives its referrer. Logs has no such field. The SQL API and the GraphQL API refuse the referrer's host
  (`clientRefererHost`) and the query (`clientRequestQuery`) of `events.httpRequests`, although the table lists them.
  The beacon records the referrer of each page view, also on the 404 page, because the layout starts it on every page.
  A view at a path that is not a page of the site is a view of the 404 page. If its referrer has the same host, a link
  of the site led there. This query selects these views, as far back as Web Analytics keeps them (6 months):

  ```sql
  SELECT "requestHost", "requestPath", "refererPath", count() AS "views"
  FROM "events"."rumPageloadEvents"
  WHERE "accountTag" = '<the account ID>' AND "refererHost" = "requestHost"
    AND "requestPath" NOT IN ('/', '/review', '/analysis', '/practice', '/editor', '/how-reviews-work', '/tools',
      '/notation', '/about', '/developers', '/privacy', '/notices', '/import', '/learn', '/puzzles', '/lab/engine')
  GROUP BY "requestHost", "requestPath", "refererPath"
  ```

  The list holds every page of the site: the sitemap's pages and four more. Add each new page to it. The query sees
  only pages that a browser opens with the beacon. It does not see a missing file, a bot, or a browser that blocks the
  beacon. In the dashboard, the Path breakdown of Web analytics shows the same views, and its Referer breakdown shows
  the referrer's host.
- **Each deploy leaves old code behind.** A page that loaded before a deploy, or a crawler that read that page, asks
  for that build's files under `/_app/immutable/`. Pages serves only the new build's files, so these requests get 404.
  In a navigation, SvelteKit then loads the page again in full.
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
  cleaner than an error page. The only record left is `hedgeschool`'s CNAME to `hedgeschool.pages.dev`. The hub takes
  the bare domain as a custom domain of its own Pages project (section 8), and Pages adds its record.
