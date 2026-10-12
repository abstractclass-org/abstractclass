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
| The code | The private GitHub repository `seankao31/hedgeschool`: `dev` for the work, `main` for the live site | A push to `main` deploys. A push to `dev` builds a preview. |
| The host | Cloudflare Pages, the project `hedgeschool` | Builds the site from the repository and serves the files. Also at `hedgeschool.pages.dev`. |
| The engine | GitHub Releases of the public repository `seankao31/enclosure-engine` | The module and the networks, pinned by SHA-256 in `engine.lock.json`. The build downloads them. |
| Visit counts | Google Analytics (the property's measurement ID `G-C5RY6DWGWN`) and Cloudflare Web Analytics | Counted in the browser (`src/lib/analytics.svelte.ts`). |

The site is static files: every page is prerendered, and the engine runs in the visitor's browser. No server code runs
at Cloudflare.

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

The site's repository is private on GitHub: `seankao31/hedgeschool`. Its remote in the local checkout is `origin`
(SSH). Two branches:

- **`dev`:** the work. Each commit is pushed to it, so that GitHub holds the local work. Pages builds each push to
  `dev` as a preview deployment, at `dev.hedgeschool.pages.dev` (and at an address for each deployment), with the
  preview environment's variables.
- **`main`:** the live site. A release brings `main` to `dev`'s commit: `git push origin dev:main` (a fast-forward).
  Pages then builds and publishes it at `hedgeschool.abstractclass.org`.

What the repository holds for Pages:

- **The build command,** `npm run build:cloudflare` (`package.json`): it downloads the engine's release and checks each
  file's SHA-256 (`npm run engine -- --deploy`, which refuses a local engine file), runs the tests and the type check,
  then builds into `build/`. A failed test or type error fails the deploy, and the live site stays as it was.
- **No file over 25 MiB:** Pages refuses a larger file. The engine's step stores each network's graph and ONNX
  Runtime's WebAssembly compressed with gzip, and splits a compressed file over 24 MiB into parts. The page joins and
  decompresses them ([design 15](design/15-gpu.md)).
- **Node 24** (`.node-version`). Pages' build image has Node 22.16 by default, which cannot run the tests' TypeScript
  without a flag.
- **The response headers** (`static/_headers`, copied into `build/`): `X-Robots-Tag: noindex` on every file, and a
  year's cache, never checked again, for the build's hashed code (`/_app/immutable/*`) and the engine's files
  (`/engine/:id/:file`). Their paths name their content, so a file there never changes. `/engine/manifest.json` keeps
  the default: the browser checks it on each load.
- **A 404 page** (`404.html`, adapter-static's fallback, in `vite.config.ts`). Without a `404.html`, Pages serves the
  home page for any address (its rule for single-page applications).
- **The site's version** in the footer: the commit, which Pages gives the build as `CF_PAGES_COMMIT_SHA`
  (`vite.config.ts`).
- **The site's address in the userscript** (`/hedge-school.user.js`, design 11): it updates from there and opens the
  review there. A build of `main` (`CF_PAGES_BRANCH`) names `https://hedgeschool.abstractclass.org`, a build of
  another branch its preview's address (`CF_PAGES_URL`), and a local build the local preview server. The variable
  `SITE_ORIGIN` sets another, for a test on another address.

To try the build as Pages runs it: `VITE_EDITION=early npm run build:cloudflare`. From a clean clone, run `npm ci`
first.

## 3. The Pages project

1. In the Cloudflare dashboard, **Workers & Pages → Create**. The page offers Workers first: choose **Pages**, then
   **Import an existing Git repository**.
2. **Connect GitHub:** install Cloudflare's GitHub app, and give it access to the one repository, `hedgeschool`.
3. **Set up the build:**

   | Setting | Value |
   |---|---|
   | Project name | `hedgeschool` (its address: `hedgeschool.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npm run build:cloudflare` |
   | Build output directory | `build` |
   | Root directory | empty |
   | Variable `VITE_EDITION` | `early` |
   | Variable `VITE_GA_ID` | `G-C5RY6DWGWN` |
   | Variable `VITE_CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics' token (step 5 below), when there is one |

   Pages installs the dependencies (`npm ci`) before the build command.
4. **Save and Deploy.** The first build takes a few minutes. Its log is under the project's deployments.
5. **The custom domain:** in the project, **Custom domains → Set up a custom domain →**
   `hedgeschool.abstractclass.org`. The zone is on Cloudflare, so Pages adds the DNS record (a CNAME to
   `hedgeschool.pages.dev`) by itself. The certificate follows in a few minutes.

**Why the framework preset is None, not SvelteKit.** A preset only fills in the build command and the output
directory. Cloudflare's SvelteKit preset gives `npm run build` and `.svelte-kit/cloudflare`: the output of Cloudflare's
own SvelteKit adapter, which renders pages on a server in a Worker. This site uses adapter-static, which writes plain
files to `build/`, because the site is static by design ([design/02-static-site.md](design/02-static-site.md)). The
Cloudflare adapter would also put each request through a Worker: the free plan's daily request limit would apply, and
`_headers` does not apply to a Worker's responses.

**The variables** are read when the site is built, so a change needs a new deploy (**Deployments → Retry deployment**,
or a push). Production and preview deployments have their own (**Settings**, then the environment's selector at the
top right):

| Variable | Production | Preview |
|---|---|---|
| `VITE_EDITION` | `early` | `early` |
| `VITE_GA_ID` | the measurement ID | none, so that previews are not counted |
| `VITE_CF_ANALYTICS_TOKEN` | the token | none |

**Preview deployments** (**Settings → Branch control**, preview branch: all branches other than `main`): free, as
production builds are. Each counts toward the free plan's 500 builds a month, and the free plan builds one at a time,
so a preview that is building delays a release by a minute or so. Preview addresses are public, and unlisted like the
site (`noindex`). **Preview access** in the project's settings can put them behind a sign-in (Cloudflare Access).

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
   beacon must start only after the import page removes a game record from the address, and the site's own code
   makes sure of that.
3. The snippet that Cloudflare then shows holds the site's token (`data-cf-beacon='{"token": "…"}'`). Set the token
   alone, the 32 hexadecimal digits, as `VITE_CF_ANALYTICS_TOKEN`, and deploy again. The site adds the beacon itself
   (`src/lib/analytics.svelte.ts`): the snippet is not pasted anywhere. The beacon finds its token by its own script
   element, or else by the element with `data-cf-beacon`, so the site's plain script works as well as the snippet's
   `type='module'`.
4. Do not turn on the Pages project's own Web Analytics (**Metrics → Web Analytics**): it also adds the beacon to every
   page, so visits would count twice.

## Deploy, check and roll back

- **Deploy:** release `dev` to `main` (`git push origin dev:main`). Pages builds and publishes in a minute or two. A
  failed build leaves the live site as it was. Try a change first on `dev`'s preview.
- **Check:** the footer's version is the commit that Pages built. On the live site, these hold (all true on
  2026-10-12, at commit `3580146`):
  - every page and file answers with `X-Robots-Tag: noindex`, and an unknown address answers 404.
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
