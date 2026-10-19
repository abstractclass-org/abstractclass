# A request to the visitors whose blocker stops Google Analytics

**Status:** in force, and built. **Decided:** 2026-10-18.

## Context

The site counts visits with Google Analytics, in Google's consent mode (design 11), and the decisions of design 17
wait on its events. An ad blocker or the browser's tracking protection often stops the Google tag. The visits of that
browser are then missing from every count, also when the visitor accepted Google Analytics' cookies in the consent
banner (design 25). Hedge School shows no ads, so a blocker that stops the tag removes no ad here. It removes only the
counts.

## Decision

1. **Ask, in the consent banner's card and place.** A visitor who accepted Google Analytics' cookies, and whose
   Google tag did not run, sees a card at the window's lower left, with the collie, as the consent banner. It shows
   only after the banner: never over it, and never with it. It shows at once after an Accept, when the tag did not
   run in that page.
2. **The page checks its own tag, not blockers.** The page loads gtag.js from googletagmanager.com (design 11). The tag
   did not run when its script failed to load (the script's `error` event), or loaded and did not run as the tag.
   gtag.js defines `google_tag_manager` as it runs, before its `load` event. A blocker's stand-in for it (uBlock
   Origin's `googletagmanager_gtm.js`) loads, and defines none. Firefox's stand-in for Google Analytics and the tag
   (its SmartBlock shim) also defines none. Until the script answers, the card does not show. A failed network load
   gives the one false alarm.
3. **Only the visitors who accepted.** A visitor who declined, or who has not chosen yet, never sees the card. A
   visitor who declined made the choice that the banner offers, and a request would press against it. A Decline on the
   privacy page closes the card at once.
4. **Once in each browser.** The card shows on each page until the visitor closes it, as the banner shows until a
   choice. Close keeps that in the browser (`hedge-school:analytics-ask:1`), and the card does not show again there.
   A tab follows a Close in another tab. The card is not a wall: the page under it scrolls and takes clicks.
5. **Its words invite** (plain web writing: CLAUDE.md, "Writing the site's text"). They say that the site shows no
   ads, what Google Analytics does for the site, and how to allow the site. A failed network load also shows the
   card, so the words do not say that a blocker certainly stopped the tag:

   > **Could you allow this site in your blocker?**
   > Thanks for accepting Google Analytics. It looks like an ad blocker or your browser's tracking protection is
   > blocking it on this site.
   >
   > Hedge School shows no ads. Google Analytics tells us which pages and tools people use, so we know what to build
   > next.
   >
   > To allow it, disable your ad blocker or tracking protection for this site, then reload the page.
   >
   > [Close] Privacy

6. **No way past a blocker.** The site does not send the tag through its own address (a first-party proxy, or
   Cloudflare Zaraz) to get past a blocker. That would override the visitor's own choice.
7. **No event for the card.** The card shows only in a page where the tag did not run, so an event of its showing or
   of its Close cannot reach Google Analytics: design 17's events go through the tag. Cloudflare Web Analytics takes
   no events.

## Why

- **The tag's own load is a sure signal,** and it needs no list of blockers. The page asks only about the one thing
  that it needs.
- **Only the visitors who accepted:** they agreed to be counted, and the blocker stops what they accepted.
- **The banner's card and place:** the visitor knows the card already, and it stops nothing on the page.
- **Once:** a visitor who closes the card has answered. A second request would press harder.

## Alternatives

- **A notice under the header:** it moves the page down when it shows, and it takes height on every page.
- **A line in the footer:** few pages have the footer, and few visitors read it.
- **The Support Us dialog:** it is about tips, and it opens only on a click.
- **Ask every visitor with a blocker, also those who declined:** it presses against the banner's choice.
- **Detect ad blockers in general, with bait elements:** a race that the filter lists win, and it would ask about
  blockers that do not stop the tag.
- **A first-party proxy, or Cloudflare Zaraz:** more visits counted, against the visitor's choice.
- **An event when the card shows and when it closes:** it cannot arrive (item 7). An event on a later page, where the
  tag runs in a browser that showed the card, could count the visitors who followed the request. It is not built:
  a failed network load would count too, and no count of the cards shown would give its rate.
- **Ask again after a time:** more visits counted, but each request after a Close presses harder.

## Consequences

- A visitor who follows the request comes back into design 17's counts.
- The site cannot count how many visitors see the card, or how many follow it.
- If the site shows ads one day, the card's words change in the same release.
- The privacy page says that the site asks, and what it checks.

## Where it is

- The check and the choice: `src/lib/analytics.svelte.ts` (`asksToAllow`, `closeAsk`, and the script's `load` and
  `error` events in `startAnalytics`).
- The card: `src/lib/AnalyticsAsk.svelte`, in the card that it shares with the consent banner
  (`src/lib/ui/CornerCard.svelte`). The layout shows it (`src/routes/+layout.svelte`).
- The check in a browser: `tests/analytics-ask.spec.ts`, on a build with a made-up measurement ID
  (`VITE_GA_ID=G-TEST000000`). It stops the tag's script, puts a blocker's stand-in in its place, or loads it from
  Google, and stops every other request to Google. A build without the Google tag skips it, as the builds of CI do.

## Log entries

- [decisions/product.md](../decisions/product.md): "A request to the visitors whose blocker stops Google
  Analytics" (2026-10-18).
