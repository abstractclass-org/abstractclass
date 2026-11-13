<script lang="ts">
  // The section "Buttons" of the sites' pages for developers (Hedge School's design 18, item 11): a kit, not a widget.
  // The site gives its head (`file`, served at /brand/, and `head`, its name in the text, as "the collie"), the sample
  // style (`css`, which this page also uses, under the class `className`) and `withHead`, the words that introduce
  // the head. `headItem` is the item on the head's file and its use. The four labels have the site's name.
  import type { Snippet } from "svelte";
  let { site, live, className, css, file, head, withHead, headItem }: {
    site: string; live: string; className: string; css: string; file: string; head: string; withHead: string;
    headItem: Snippet;
  } = $props();
  const shown = $derived<[string, string][]>([[`Review in ${site}`, ""], ["Review", `Review in ${site}`],
                                               [`Open in ${site}`, ""], ["Open", `Open in ${site}`]]);
  const buttons = $derived(`<!-- On a finished game: a link, made as "A link to a review" shows. -->
<a class="${className}" href="${live}/import#record=…" target="_blank">
  <img src="${file}" alt=""> Review in ${site}
</a>
<!-- Where space is short: ${head} names the site, and the full label is the name that screen readers say. -->
<a class="${className}" href="${live}/import#record=…" target="_blank"
   aria-label="Review in ${site}" title="Review in ${site}">
  <img src="${file}" alt=""> Review
</a>

<!-- On a saved review: a button, whose click runs the code of "A saved review opened again". -->
<button class="${className}" type="button">
  <img src="${file}" alt=""> Open in ${site}
</button>
<button class="${className}" type="button" aria-label="Open in ${site}" title="Open in ${site}">
  <img src="${file}" alt=""> Open
</button>`);
</script>

<svelte:head>{@html `<style>${css}</style>`}</svelte:head>

<h2 id="buttons">Buttons</h2>
<p>Four buttons, {withHead}: the full labels, and short ones where space is short. "Review" goes on a
  finished game, and "Open" on a saved review. "Save to" is in {site}'s own Export menu, so it needs no button.</p>
{#each ["#ffffff", "#16181c"] as background (background)}
  <div class="mb-3 flex flex-wrap gap-3 p-4 rounded border border-line" style:background>
    {#each shown as [label, full] (label)}
      <span class={className} title={full || undefined}><img src="/brand/{file}" alt="" /> {label}</span>
    {/each}
  </div>
{/each}
<ul>
  {@render headItem()}
  <li><strong>The style is yours to change:</strong> the colours and the font can follow your site. Keep the labels'
    words, so that players know where a button leads.</li>
  <li><strong>A short label</strong> leaves the name to {head}. Give its button the full label as its
    <code>aria-label</code> and its <code>title</code>, as below.</li>
</ul>
<pre>{buttons}</pre>
<pre>{css}</pre>
