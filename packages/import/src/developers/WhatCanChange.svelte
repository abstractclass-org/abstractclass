<script lang="ts">
  // The section "What can change" of the sites' pages for developers (Hedge School's design 18, item 9): the promises
  // that both sites make. `lenient` lists what the site's reader takes beyond its notation page, and `changes` holds the
  // dated items of the site's list of changes, when it has one.
  import type { Snippet } from "svelte";
  import { PROTOCOL } from "../partners.ts";
  let { site, lenient, changes }: { site: string; lenient: string; changes?: Snippet } = $props();
</script>

<h2 id="changes">What can change</h2>
<ul>
  <li><strong>{site} reads more than it asks for:</strong> {lenient}. A site that writes the notation as its page
    describes it keeps working.</li>
  <li><strong>Changes are additions:</strong> new optional tags or parameters, which old links do not have. A change
    that old links could not meet would come with a version in the link, and {site} would still read the old
    form.</li>
  <li><strong>During the early access, an address can move.</strong> The old address then forwards to the new one for
    a while, and this page says, a month before, when it stops.</li>
  <li><strong>The messages have a version,</strong> <code>protocol: {PROTOCOL}</code>. A later version would be one that the
    save page asks for in its <code>ready</code> message. A page that asks for none keeps getting version 1.
    {site}'s own <code>ready</code> names the version that it asks for.</li>
  <li><strong>The review file is {site}'s:</strong> store it as it is. Its contents can change, and it carries
    its own format and version, for {site} to read.</li>
  {#if changes}
    <li><strong>Changes:</strong>
      <ul>
        {@render changes()}
      </ul>
    </li>
  {/if}
</ul>
